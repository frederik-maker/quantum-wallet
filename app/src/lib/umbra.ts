/**
 * Umbra Privacy SDK integration.
 * Adds confidential transfers on top of quantum-safe vault operations.
 *
 * Flow: Vault (quantum-safe) -> Umbra (privacy) -> Recipient
 * This gives both quantum resistance AND transaction privacy.
 *
 * Uses @umbra-privacy/sdk v4 with @solana/kit signer interface.
 */

/**
 * Umbra's deposit program throws AnchorError 14017 "TimestampInFuture" when
 * the `tvk_timestamp` in the instruction is ahead of the block's
 * `Clock::unix_timestamp`. Cluster clock ALWAYS lags wall time — block time
 * is stamped at slot production, so on mainnet it's routinely 0.5-3s behind,
 * on devnet sometimes 10-30s. Umbra's SDK defaults to stamping from
 * `new Date()` (wall time) and the check is strict, so it fails constantly.
 *
 * Fortunately the SDK exposes `deps.random.getUtcNow` exactly for this —
 * when provided, it replaces `new Date()` inside the SDK. Return past time
 * components and the on-chain check passes comfortably.
 */
const UMBRA_CLOCK_LAG_BUFFER_SECONDS = 45;
function pastUtcComponents() {
  const d = new Date(Date.now() - UMBRA_CLOCK_LAG_BUFFER_SECONDS * 1000);
  console.log("[umbra] past-clock getUtcNow →", d.toISOString());
  return {
    year: BigInt(d.getUTCFullYear()),
    month: BigInt(d.getUTCMonth() + 1),
    day: BigInt(d.getUTCDate()),
    hour: BigInt(d.getUTCHours()),
    minute: BigInt(d.getUTCMinutes()),
    second: BigInt(d.getUTCSeconds()),
  };
}
const pastClockDeps = {
  random: { getUtcNow: pastUtcComponents },
};

/**
 * Belt-and-suspenders: in addition to deps.random.getUtcNow (preferred path),
 * also replace the global Date constructor for the duration of an SDK call.
 * Any `new Date()` inside the SDK that bypasses the getUtcNow hook will still
 * get shifted to past time.
 */
async function withPatchedDate<T>(fn: () => Promise<T>): Promise<T> {
  const RealDate = globalThis.Date;
  const realNow = RealDate.now.bind(RealDate);
  const LAG_MS = UMBRA_CLOCK_LAG_BUFFER_SECONDS * 1000;

  class PatchedDate extends RealDate {
    constructor(...args: ConstructorParameters<typeof Date> | []) {
      if (args.length === 0) {
        super(realNow() - LAG_MS);
      } else {
        super(...args);
      }
    }
    static now() {
      return realNow() - LAG_MS;
    }
  }

  globalThis.Date = PatchedDate as unknown as DateConstructor;
  try {
    return await fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

// Umbra program IDs (for reference)
export const UMBRA_PROGRAM_ID_MAINNET = "UMBRAD2ishebJTcgCLkTkNUx1v3GyoAgpTRPeWoLykh";
export const UMBRA_PROGRAM_ID_DEVNET = "DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ";

// Native SOL wrapped mint
const WSOL_MINT = "So11111111111111111111111111111111111111112";

// Indexer endpoints
const INDEXER_MAINNET = "https://utxo-indexer.api.umbraprivacy.com";
const INDEXER_DEVNET = "https://utxo-indexer.api-devnet.umbraprivacy.com";

// Relayer endpoints (claims are submitted through Umbra's relayer, which covers
// recipient fees so the claim can happen without revealing claimer's identity)
const RELAYER_MAINNET = "https://relayer.api.umbraprivacy.com";
const RELAYER_DEVNET = "https://relayer.api-devnet.umbraprivacy.com";

/**
 * Get a ZK asset provider that routes through our Next.js proxy to avoid CORS.
 * The CDN (d3j9fjdkre529f.cloudfront.net) blocks cross-origin requests from localhost.
 */
async function getProxiedZkAssetProvider() {
  const { getCdnZkAssetProvider } = await import("@umbra-privacy/web-zk-prover");
  // The CDN provider accepts baseUrl — point it at our Next.js rewrite proxy
  return getCdnZkAssetProvider({
    baseUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/umbra-zk-cdn`,
  });
}

export interface UmbraConfig {
  network: "mainnet" | "devnet";
  rpcUrl: string;
  feePayerSecret: number[]; // raw secret key bytes from wallet store
}

/**
 * Create an IUmbraSigner from raw secret key bytes.
 * The SDK requires its own signer type, not @solana/web3.js Keypair.
 */
async function createSigner(feePayerSecret: number[]) {
  const { createSignerFromPrivateKeyBytes } = await import("@umbra-privacy/sdk");
  return createSignerFromPrivateKeyBytes(Uint8Array.from(feePayerSecret));
}

/**
 * Initialize the Umbra client for private transfers.
 */
export async function createUmbraClient(config: UmbraConfig) {
  const { getUmbraClient } = await import("@umbra-privacy/sdk");

  const signer = await createSigner(config.feePayerSecret);

  const rpcSubscriptionsUrl = config.rpcUrl
    .replace("https://", "wss://")
    .replace("http://", "ws://");

  const client = await getUmbraClient({
    signer,
    network: config.network,
    rpcUrl: config.rpcUrl,
    rpcSubscriptionsUrl,
    indexerApiEndpoint:
      config.network === "mainnet" ? INDEXER_MAINNET : INDEXER_DEVNET,
  });

  return client;
}

/**
 * Register a user with Umbra for confidential + anonymous transfers.
 * Registration is idempotent — safe to call multiple times.
 * Must be called before sending or receiving private transfers.
 */
export async function registerUmbraUser(config: UmbraConfig) {
  const { getUserRegistrationFunction } = await import("@umbra-privacy/sdk");
  const { getUserRegistrationProver } = await import("@umbra-privacy/web-zk-prover");
  const client = await createUmbraClient(config);
  const assetProvider = await getProxiedZkAssetProvider();
  const zkProver = getUserRegistrationProver({ assetProvider });
  const register = getUserRegistrationFunction(
    { client },
    { zkProver, ...pastClockDeps } as Parameters<typeof getUserRegistrationFunction>[1]
  );
  const sigs = await withPatchedDate(() => register({ confidential: true, anonymous: true }));
  return sigs;
}

/**
 * Deposit SOL from public balance into encrypted Umbra balance.
 * This shields the funds — making them private.
 */
export async function depositToEncrypted(
  config: UmbraConfig,
  amount: bigint
) {
  const {
    getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
  } = await import("@umbra-privacy/sdk");

  const client = await createUmbraClient(config);
  const signer = await createSigner(config.feePayerSecret);
  const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction(
    { client },
    pastClockDeps as Parameters<typeof getPublicBalanceToEncryptedBalanceDirectDepositorFunction>[1]
  );

  const result = await withPatchedDate(() => deposit(
    signer.address,
    WSOL_MINT as unknown as Parameters<typeof deposit>[1],
    amount as unknown as Parameters<typeof deposit>[2]
  ));

  return result;
}

/**
 * Withdraw from encrypted balance back to public.
 */
export async function withdrawFromEncrypted(
  config: UmbraConfig,
  amount: bigint
) {
  const {
    getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction,
  } = await import("@umbra-privacy/sdk");

  const client = await createUmbraClient(config);
  const signer = await createSigner(config.feePayerSecret);
  const withdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({
    client,
  });

  const result = await withdraw(
    signer.address,
    WSOL_MINT as unknown as Parameters<typeof withdraw>[1],
    amount as unknown as Parameters<typeof withdraw>[2]
  );

  return result;
}

/**
 * Send a private transfer via Umbra UTXO system.
 * The recipient can scan and claim without revealing the sender.
 *
 * Full privacy flow:
 * 1. Fee payer deposits from public balance
 * 2. Umbra creates a claimable UTXO for the recipient
 * 3. Recipient scans and claims
 *
 * Requires @umbra-privacy/web-zk-prover for ZK proof generation.
 */
export async function sendPrivateTransfer(
  config: UmbraConfig,
  recipient: string,
  amount: bigint
) {
  const {
    getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  } = await import("@umbra-privacy/sdk");

  const {
    getCreateReceiverClaimableUtxoFromPublicBalanceProver,
  } = await import("@umbra-privacy/web-zk-prover");

  const client = await createUmbraClient(config);
  const assetProvider = await getProxiedZkAssetProvider();
  const zkProver = getCreateReceiverClaimableUtxoFromPublicBalanceProver({ assetProvider });

  const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
    { client },
    { zkProver, ...pastClockDeps } as Parameters<typeof getPublicBalanceToReceiverClaimableUtxoCreatorFunction>[1]
  );

  const sigs = await withPatchedDate(() => createUtxo({
    destinationAddress: recipient as unknown as Parameters<typeof createUtxo>[0]["destinationAddress"],
    mint: WSOL_MINT as unknown as Parameters<typeof createUtxo>[0]["mint"],
    amount: amount as unknown as Parameters<typeof createUtxo>[0]["amount"],
  }));

  return sigs;
}

/**
 * Scan Umbra's mixer tree for claimable UTXOs addressed to this wallet.
 * Returns four buckets:
 *  - received / publicReceived: UTXOs sent TO this wallet by others (or by self via receiver flow)
 *  - selfBurnable / publicSelfBurnable: UTXOs this wallet created for itself
 * When the user private-sends to their own address, the deposit lands in `publicReceived`
 * because we use the receiver-claimable UTXO creator flow.
 */
export async function scanForTransfers(config: UmbraConfig, treeIndex = 0) {
  const { getClaimableUtxoScannerFunction } = await import("@umbra-privacy/sdk");

  const client = await createUmbraClient(config);
  const scan = getClaimableUtxoScannerFunction({ client });

  const result = await scan(treeIndex as unknown as Parameters<typeof scan>[0], 0 as unknown as Parameters<typeof scan>[1]);
  return {
    received: result.received,
    publicReceived: result.publicReceived,
    selfBurnable: result.selfBurnable,
    publicSelfBurnable: result.publicSelfBurnable,
  };
}

/**
 * Claim receiver-claimable UTXOs into this wallet's Umbra encrypted balance.
 * Feeds the scanned UTXOs through the receiver claimer, which generates a ZK proof
 * unlocking them and submits through Umbra's relayer (so the claim doesn't leak
 * the recipient's public address as tx fee payer).
 */
export async function claimReceivedUtxos(
  config: UmbraConfig,
  utxos: readonly unknown[]
) {
  if (utxos.length === 0) return { claimed: 0, signatures: {} };

  const { getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction, getUmbraRelayer } = await import("@umbra-privacy/sdk");
  const { getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver } = await import("@umbra-privacy/web-zk-prover");

  const client = await createUmbraClient(config);
  const assetProvider = await getProxiedZkAssetProvider();
  const zkProver = getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver({ assetProvider });
  const relayer = getUmbraRelayer({
    apiEndpoint: config.network === "mainnet" ? RELAYER_MAINNET : RELAYER_DEVNET,
  });

  const claim = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
    { client },
    { zkProver, relayer, ...pastClockDeps } as unknown as Parameters<typeof getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction>[1]
  );

  const result = await withPatchedDate(() =>
    claim(utxos as Parameters<typeof claim>[0])
  );
  return { claimed: utxos.length, result };
}

/**
 * Query this wallet's Umbra encrypted balance for SOL (wrapped via WSOL).
 * Returns lamports as a number, or null if the account isn't initialized yet.
 */
export async function queryEncryptedSolBalance(
  config: UmbraConfig
): Promise<number | null> {
  const { getEncryptedBalanceQuerierFunction } = await import("@umbra-privacy/sdk");
  const client = await createUmbraClient(config);
  const query = getEncryptedBalanceQuerierFunction({ client });
  const result = await query([WSOL_MINT as unknown as Parameters<typeof query>[0][number]]);
  const entry = Array.from(result.values())[0];
  if (!entry) return null;
  if (entry.state === "shared") {
    // U64 lamports — cast through unknown because SDK's U64 type is opaque
    return Number(entry.balance as unknown as bigint);
  }
  // non_existent | uninitialized | mxe — treat as "no claimable balance yet"
  return null;
}

/**
 * Check if Umbra is available and the user is registered.
 */
export async function checkUmbraStatus(
  config: UmbraConfig
): Promise<{ available: boolean; registered: boolean }> {
  try {
    await createUmbraClient(config);
    return { available: true, registered: true };
  } catch {
    return { available: false, registered: false };
  }
}

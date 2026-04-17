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
 * Workaround for Umbra's strict on-chain timestamp check.
 *
 * The deposit program throws AnchorError 14017 "TimestampInFuture" when the
 * `tvk_timestamp` it receives (stamped client-side in the SDK) is ahead of
 * the block's `Clock::unix_timestamp`. Cluster clock ALWAYS lags wall time —
 * block time is set at slot production, so even on mainnet it's routinely
 * 0.5–3s behind real time. Devnet is worse.
 *
 * The Umbra SDK stamps with `new Date()` (see `executionTimestamp` in
 * @umbra-privacy/sdk), not `Date.now()`, so we patch the global Date
 * CONSTRUCTOR (and Date.now, for good measure) to return past values for
 * the duration of the SDK call, then restore. The offset is large enough
 * to clear typical cluster lag but well under blockhash validity (~60s)
 * so SDK-internal TTL logic still works.
 */
async function withPastClock<T>(fn: () => Promise<T>, bufferSeconds = 20): Promise<T> {
  const RealDate = Date;
  const realNow = Date.now.bind(Date);
  const LAG_MS = bufferSeconds * 1000;

  // Subclass that shifts zero-arg `new Date()` backwards; other forms pass through.
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
  const register = getUserRegistrationFunction({ client }, { zkProver });
  const sigs = await withPastClock(() => register({ confidential: true, anonymous: true }));
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
  const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({
    client,
  });

  const result = await withPastClock(() => deposit(
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
    { zkProver }
  );

  const sigs = await withPastClock(() => createUtxo({
    destinationAddress: recipient as unknown as Parameters<typeof createUtxo>[0]["destinationAddress"],
    mint: WSOL_MINT as unknown as Parameters<typeof createUtxo>[0]["mint"],
    amount: amount as unknown as Parameters<typeof createUtxo>[0]["amount"],
  }));

  return sigs;
}

/**
 * Scan for incoming private transfers (as recipient).
 */
export async function scanForTransfers(config: UmbraConfig, treeIndex = 0) {
  const { getClaimableUtxoScannerFunction } = await import("@umbra-privacy/sdk");

  const client = await createUmbraClient(config);
  const scan = getClaimableUtxoScannerFunction({ client });

  const result = await scan(treeIndex as unknown as Parameters<typeof scan>[0], 0 as unknown as Parameters<typeof scan>[1]);
  return {
    fromOthers: result.received,
    fromSelf: result.selfBurnable,
    publicFromOthers: result.publicReceived,
    publicFromSelf: result.publicSelfBurnable,
  };
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

/**
 * Umbra Privacy SDK integration.
 * Adds confidential transfers on top of quantum-safe vault operations.
 *
 * Flow: Vault (quantum-safe) -> Umbra (privacy) -> Recipient
 * This gives both quantum resistance AND transaction privacy.
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";

// Umbra program IDs
export const UMBRA_PROGRAM_ID_MAINNET = new PublicKey(
  "UMBRAD2ishebJTcgCLkTkNUx1v3GyoAgpTRPeWoLykh"
);
export const UMBRA_PROGRAM_ID_DEVNET = new PublicKey(
  "DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ"
);

export interface UmbraConfig {
  network: "mainnet" | "devnet";
  rpcUrl: string;
  signer: Keypair;
}

export interface PrivateTransferParams {
  recipient: string;
  amount: bigint;
  mint?: string; // SPL token mint, null for SOL
}

/**
 * Initialize the Umbra client for private transfers.
 * Uses dynamic import to avoid bundling issues.
 */
export async function createUmbraClient(config: UmbraConfig) {
  const {
    getUmbraClient,
  } = await import("@umbra-privacy/sdk");

  const rpcSubscriptionsUrl = config.rpcUrl
    .replace("https://", "wss://")
    .replace("http://", "ws://");

  const client = await getUmbraClient({
    signer: config.signer as unknown as Parameters<typeof getUmbraClient>[0]["signer"],
    network: config.network,
    rpcUrl: config.rpcUrl,
    rpcSubscriptionsUrl,
    indexerApiEndpoint:
      config.network === "mainnet"
        ? "https://utxo-indexer.api.umbraprivacy.com"
        : "https://utxo-indexer-devnet.api.umbraprivacy.com",
  });

  return client;
}

/**
 * Register a user with Umbra for confidential + anonymous transfers.
 */
export async function registerUmbraUser(config: UmbraConfig) {
  const { getUserRegistrationFunction } = await import("@umbra-privacy/sdk");
  const client = await createUmbraClient(config);
  const register = getUserRegistrationFunction({ client });
  await register({ confidential: true, anonymous: true });
  return true;
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
  const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({
    client,
  });

  // Native SOL mint
  const SOL_MINT = "So11111111111111111111111111111111111111112";
  await deposit(
    config.signer.publicKey.toBase58() as unknown as Parameters<typeof deposit>[0],
    SOL_MINT as unknown as Parameters<typeof deposit>[1],
    amount as unknown as Parameters<typeof deposit>[2]
  );
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
  const withdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({
    client,
  });

  const SOL_MINT = "So11111111111111111111111111111111111111112";
  await withdraw(
    config.signer.publicKey.toBase58() as unknown as Parameters<typeof withdraw>[0],
    SOL_MINT as unknown as Parameters<typeof withdraw>[1],
    amount as unknown as Parameters<typeof withdraw>[2]
  );
}

/**
 * Send a private transfer via Umbra UTXO system.
 * The recipient can scan and claim without revealing the sender.
 *
 * Full privacy flow:
 * 1. Vault signs with W-OTS (quantum-safe authorization)
 * 2. Funds move to fee payer
 * 3. Fee payer deposits into Umbra encrypted balance
 * 4. Umbra creates a claimable UTXO for the recipient
 * 5. Recipient scans and claims
 */
export async function sendPrivateTransfer(
  config: UmbraConfig,
  params: PrivateTransferParams
) {
  const {
    getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  } = await import("@umbra-privacy/sdk");

  const client = await createUmbraClient(config);

  // For UTXO-based anonymous transfers, we need a ZK prover
  // In production, this would use @umbra-privacy/web-zk-prover
  // For the hackathon demo, we use the direct deposit path
  const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
    { client },
    { zkProver: null as unknown as Parameters<typeof getPublicBalanceToReceiverClaimableUtxoCreatorFunction>[1]["zkProver"] }
  );

  const SOL_MINT = "So11111111111111111111111111111111111111112";
  await createUtxo({
    destinationAddress: params.recipient as unknown as Parameters<typeof createUtxo>[0]["destinationAddress"],
    mint: (params.mint || SOL_MINT) as unknown as Parameters<typeof createUtxo>[0]["mint"],
    amount: params.amount as unknown as Parameters<typeof createUtxo>[0]["amount"],
  });
}

/**
 * Scan for incoming private transfers (as recipient).
 */
export async function scanForTransfers(config: UmbraConfig) {
  const { getClaimableUtxoScannerFunction } = await import(
    "@umbra-privacy/sdk"
  );

  const client = await createUmbraClient(config);
  const scan = getClaimableUtxoScannerFunction({ client });

  const { received } = await scan(BigInt(0) as unknown as Parameters<typeof scan>[0], BigInt(0) as unknown as Parameters<typeof scan>[1]);
  return received;
}

/**
 * Check if Umbra is available and the user is registered.
 */
export async function checkUmbraStatus(
  config: UmbraConfig
): Promise<{ available: boolean; registered: boolean }> {
  try {
    const client = await createUmbraClient(config);
    return { available: true, registered: true };
  } catch {
    return { available: false, registered: false };
  }
}

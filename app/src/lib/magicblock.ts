/**
 * MagicBlock Ephemeral Rollups integration.
 * Uses MagicBlock's high-speed execution environment for vault operations.
 *
 * Benefits for Quantum Vault:
 * - Faster vault rotation (10-50ms vs ~400ms on mainnet)
 * - Batch vault operations in ephemeral rollup
 * - Private execution of key rotation
 *
 * Integration approach:
 * - Use MagicBlock's router to send vault transactions
 * - Vault operations execute in ephemeral environment
 * - Results commit back to Solana mainnet
 */

import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

// MagicBlock ephemeral rollup endpoints
export const MAGICBLOCK_ROUTER_DEVNET = "https://devnet.magicblock.app";
export const MAGICBLOCK_ROUTER_MAINNET = "https://mainnet.magicblock.app";

export interface MagicBlockConfig {
  network: "devnet" | "mainnet-beta";
  feePayer: Keypair;
}

function getRouterUrl(network: string): string {
  return network === "mainnet-beta"
    ? MAGICBLOCK_ROUTER_MAINNET
    : MAGICBLOCK_ROUTER_DEVNET;
}

/**
 * Send a transaction through MagicBlock's ephemeral rollup router.
 * This routes the transaction through MagicBlock's high-speed environment
 * instead of directly to the Solana validator.
 *
 * The router automatically:
 * 1. Delegates relevant accounts to the ephemeral rollup
 * 2. Executes the transaction at high speed
 * 3. Commits results back to Solana
 */
export async function sendViaMagicBlock(
  config: MagicBlockConfig,
  transaction: Transaction
): Promise<string> {
  const routerUrl = getRouterUrl(config.network);
  const routerConnection = new Connection(routerUrl, "confirmed");

  // Get recent blockhash from the router
  const { blockhash } = await routerConnection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = config.feePayer.publicKey;
  transaction.sign(config.feePayer);

  const signature = await routerConnection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: true }
  );

  await routerConnection.confirmTransaction(signature, "confirmed");
  return signature;
}

/**
 * Execute a batch of vault operations through MagicBlock.
 * Useful for pre-initializing multiple vaults at once.
 *
 * Normal flow: 3 separate txs for 3 vaults = ~1.2s
 * MagicBlock flow: 3 txs through ephemeral rollup = ~150ms
 */
export async function batchVaultOperations(
  config: MagicBlockConfig,
  transactions: Transaction[]
): Promise<string[]> {
  const routerUrl = getRouterUrl(config.network);
  const routerConnection = new Connection(routerUrl, "confirmed");

  const { blockhash } = await routerConnection.getLatestBlockhash();

  const signatures: string[] = [];

  for (const tx of transactions) {
    tx.recentBlockhash = blockhash;
    tx.feePayer = config.feePayer.publicKey;
    tx.sign(config.feePayer);

    const sig = await routerConnection.sendRawTransaction(tx.serialize(), {
      skipPreflight: true,
    });
    signatures.push(sig);
  }

  // Confirm all in parallel
  await Promise.all(
    signatures.map((sig) =>
      routerConnection.confirmTransaction(sig, "confirmed")
    )
  );

  return signatures;
}

/**
 * Check if MagicBlock router is available for a given network.
 */
export async function checkMagicBlockAvailability(
  network: "devnet" | "mainnet-beta"
): Promise<boolean> {
  try {
    const routerUrl = getRouterUrl(network);
    const connection = new Connection(routerUrl, "confirmed");
    await connection.getLatestBlockhash();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get MagicBlock performance metrics for display in the UI.
 */
export function getMagicBlockInfo() {
  return {
    name: "MagicBlock Ephemeral Rollups",
    description: "High-speed execution environment for Solana",
    benefits: [
      "10-50ms transaction latency",
      "Batch vault rotations",
      "Private execution environment",
    ],
    docsUrl: "https://docs.magicblock.gg",
  };
}

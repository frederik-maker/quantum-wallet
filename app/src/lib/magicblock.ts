/**
 * MagicBlock Ephemeral Rollups integration.
 * Uses MagicBlock's Magic Router to route vault transactions through
 * their high-speed ephemeral execution environment.
 *
 * The Magic Router is a drop-in Connection replacement that inspects
 * writable accounts and automatically routes transactions to either
 * the ephemeral rollup (fast, ~10-50ms) or base Solana layer.
 *
 * Uses @magicblock-labs/ephemeral-rollups-sdk with ConnectionMagicRouter.
 */

import {
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

// MagicBlock Magic Router endpoints
export const MAGICBLOCK_ROUTER_DEVNET = "https://devnet-router.magicblock.app";
export const MAGICBLOCK_ROUTER_DEVNET_WS = "wss://devnet-router.magicblock.app";

// Direct ER validator endpoints (fallback)
export const MAGICBLOCK_ER_DEVNET_US = "https://devnet-us.magicblock.app";
export const MAGICBLOCK_ER_DEVNET_EU = "https://devnet-eu.magicblock.app";

export interface MagicBlockConfig {
  network: "devnet" | "mainnet-beta";
  feePayer: Keypair;
}

/**
 * Get a MagicBlock ConnectionMagicRouter.
 * This is a drop-in replacement for @solana/web3.js Connection
 * that automatically routes transactions through the ephemeral rollup
 * when the touched accounts are delegated to the ER.
 */
export async function getMagicBlockConnection(network: "devnet" | "mainnet-beta") {
  if (network === "mainnet-beta") {
    throw new Error("MagicBlock ephemeral rollups are currently available on devnet only. Switch to devnet to use this feature.");
  }

  const { ConnectionMagicRouter } = await import(
    "@magicblock-labs/ephemeral-rollups-sdk"
  );

  const connection = new ConnectionMagicRouter(MAGICBLOCK_ROUTER_DEVNET, {
    wsEndpoint: MAGICBLOCK_ROUTER_DEVNET_WS,
  });

  return connection;
}

/**
 * Send a transaction through MagicBlock's Magic Router.
 * The router automatically decides whether to execute on the
 * ephemeral rollup or the base Solana layer.
 */
export async function sendViaMagicBlock(
  config: MagicBlockConfig,
  transaction: Transaction
): Promise<string> {
  const connection = await getMagicBlockConnection(config.network);

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [config.feePayer],
    {
      skipPreflight: true,
      commitment: "confirmed",
    }
  );

  return signature;
}

/**
 * Execute a batch of vault operations through MagicBlock.
 * Useful for pre-initializing multiple vaults at once.
 *
 * Normal flow: 3 separate txs = ~1.2s
 * MagicBlock flow: 3 txs through ephemeral rollup = ~150ms
 */
export async function batchVaultOperations(
  config: MagicBlockConfig,
  transactions: Transaction[]
): Promise<string[]> {
  const connection = await getMagicBlockConnection(config.network);

  const signatures: string[] = [];
  for (const tx of transactions) {
    const sig = await sendAndConfirmTransaction(
      connection,
      tx,
      [config.feePayer],
      {
        skipPreflight: true,
        commitment: "confirmed",
      }
    );
    signatures.push(sig);
  }

  return signatures;
}

/**
 * Check if MagicBlock router is available for a given network.
 * Tries to hit the router's RPC endpoint.
 */
export async function checkMagicBlockAvailability(
  network: "devnet" | "mainnet-beta"
): Promise<boolean> {
  // MagicBlock ephemeral rollups are devnet-only for now
  if (network === "mainnet-beta") {
    throw new Error("MagicBlock rollups are available on devnet only. Switch to devnet to enable fast execution.");
  }

  try {
    const connection = await getMagicBlockConnection(network);
    // getLatestBlockhash is a lightweight RPC call to test connectivity
    await connection.getLatestBlockhash();
    return true;
  } catch {
    throw new Error("Could not connect to MagicBlock devnet router. Try again later.");
  }
}

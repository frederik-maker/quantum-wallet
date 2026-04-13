import { PublicKey } from "@solana/web3.js";

// Winternitz Vault program ID
// Uses Dean Little's deployed program while we deploy our own
// Our program fork: G75JKXTU6HP2tKdNaXzwjHtaLjrdEq5AY9SSQ1uTyjKP (pending deployment)
export const VAULT_PROGRAM_ID = new PublicKey(
  "wntrRTssxbf1rz9RPJ4xNBbpXxfsidQJT177NN3MXhB"
);

// Winternitz parameters matching the on-chain program
export const HASH_LENGTH = 28; // Truncated Keccak256 digest (224 bits)
export const CHAIN_COUNT = 32; // Number of hash chain components in pubkey
export const CHAIN_LENGTH = 256; // Max iterations per chain (byte range 0-255 + 1)
export const SIGNATURE_SIZE = HASH_LENGTH * 32; // 896 bytes

// Vault instruction discriminators
export enum VaultInstruction {
  SplitVault = 0,
  OpenVault = 1,
  CloseVault = 2,
}

// Solana constraints
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const MIN_VAULT_POOL_SIZE = 2; // Always have at least 2 pre-initialized vaults ready

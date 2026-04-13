import { PublicKey } from "@solana/web3.js";

// Winternitz Vault program ID (our fork)
export const VAULT_PROGRAM_ID = new PublicKey(
  "G75JKXTU6HP2tKdNaXzwjHtaLjrdEq5AY9SSQ1uTyjKP"
);

// Winternitz parameters matching the on-chain program
export const HASH_LENGTH = 28; // Truncated Keccak256 digest (224 bits)
export const CHAIN_COUNT = 32; // Number of hash chain components in pubkey
export const CHAIN_LENGTH = 256; // Max iterations per chain (byte range 0-255 + 1)
export const SIGNATURE_SIZE = HASH_LENGTH * 32; // 896 bytes

// Vault instruction discriminators (from vault_instructions.rs)
export enum VaultInstruction {
  OpenVault = 0,
  SplitVault = 1,
  CloseVault = 2,
}

// Solana constraints
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const MIN_VAULT_POOL_SIZE = 2;

// RPC endpoints
export const RPC_ENDPOINTS: Record<string, string> = {
  "devnet": "https://api.devnet.solana.com",
  "testnet": "https://api.testnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  "localnet": "http://localhost:8899",
};

// Umbra program IDs
export const UMBRA_PROGRAM_ID_MAINNET = "UMBRAD2ishebJTcgCLkTkNUx1v3GyoAgpTRPeWoLykh";
export const UMBRA_PROGRAM_ID_DEVNET = "DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ";

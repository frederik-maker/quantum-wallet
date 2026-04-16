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
  ApproveCrossChain = 3,
}

// Solana constraints
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const MIN_VAULT_POOL_SIZE = 2;

// RPC endpoints
export const RPC_ENDPOINTS: Record<string, string> = {
  "devnet": "https://api.devnet.solana.com",
  "testnet": "https://api.testnet.solana.com",
  "mainnet-beta": "https://alpha-orbital-spree.solana-mainnet.quiknode.pro/6f2fc8208b2a137d50502ed7f07fd175530a7f7b/",
  "localnet": "http://localhost:8899",
};

// Umbra program IDs
export const UMBRA_PROGRAM_ID_MAINNET = "UMBRAD2ishebJTcgCLkTkNUx1v3GyoAgpTRPeWoLykh";
export const UMBRA_PROGRAM_ID_DEVNET = "DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ";

// Ika dWallet
export const IKA_PROGRAM_ID = new PublicKey(
  "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY"
);
export const IKA_GRPC_ENDPOINT = "https://pre-alpha-dev-1.ika.ika-network.net:443";
export const CPI_AUTHORITY_SEED = "__ika_cpi_authority";

// Ika signature schemes (u16)
export enum DWalletSignatureScheme {
  EcdsaSecp256k1 = 0,
  EcdsaSha256 = 1,
  EcdsaDoubleSha256 = 2, // Bitcoin BIP143
  TaprootSha256 = 3,     // Bitcoin Taproot
}

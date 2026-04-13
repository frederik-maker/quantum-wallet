/**
 * Wallet state management using Zustand.
 * Manages vault pool, balances, transaction history, and wallet lifecycle.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from "@solana/web3.js";
import {
  WinternitzKeypair,
  generateKeypair,
  serializeKeypair,
  deserializeKeypair,
} from "./winternitz";
import {
  deriveVaultPDA,
  buildOpenVaultInstruction,
  buildSplitVaultInstruction,
  buildCloseVaultInstruction,
  createVaultTransaction,
  getVaultBalance,
  vaultExists,
} from "./vault";
import { MIN_VAULT_POOL_SIZE } from "./constants";

/** Represents a single vault in the pool */
export interface VaultEntry {
  id: string; // Unique identifier
  keypairJson: string; // Serialized Winternitz keypair
  address: string; // Vault PDA address (base58)
  bump: number;
  status: "pending" | "active" | "spent" | "error";
  balance: number; // Lamports
  createdAt: number;
}

/** Transaction history entry */
export interface TxHistoryEntry {
  id: string;
  type: "send" | "receive" | "migrate" | "open" | "close";
  amount: number; // Lamports
  counterparty?: string; // Address
  signature?: string; // Solana tx signature
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
}

interface WalletState {
  // Wallet identity
  initialized: boolean;
  walletName: string;

  // Solana connection
  rpcUrl: string;
  network: "devnet" | "mainnet-beta" | "testnet";

  // Fee payer (Ed25519 keypair for paying tx fees)
  feePayerSecret: number[] | null;

  // Vault pool
  vaults: VaultEntry[];

  // Transaction history
  history: TxHistoryEntry[];

  // UI state
  loading: boolean;
  error: string | null;
  totalBalance: number; // Aggregated lamports across all active vaults

  // Actions
  initializeWallet: (name: string) => Promise<void>;
  setNetwork: (network: "devnet" | "mainnet-beta" | "testnet") => void;
  refreshBalances: () => Promise<void>;
  sendSol: (recipient: string, amountLamports: number) => Promise<string>;
  getReceiveAddress: () => string | null;
  openNewVault: () => Promise<VaultEntry>;
  replenishVaultPool: () => Promise<void>;
  importLegacyWallet: (secretKey: Uint8Array) => Promise<void>;
  resetWallet: () => void;
  airdrop: () => Promise<string>;
  fundVault: () => Promise<void>;
}

function getConnection(rpcUrl: string): Connection {
  return new Connection(rpcUrl, "confirmed");
}

function generateId(): string {
  return crypto.randomUUID();
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      initialized: false,
      walletName: "",
      rpcUrl: "https://api.devnet.solana.com",
      network: "devnet",
      feePayerSecret: null,
      vaults: [],
      history: [],
      loading: false,
      error: null,
      totalBalance: 0,

      setNetwork: (network) => {
        const rpcUrl =
          network === "mainnet-beta"
            ? "https://api.mainnet-beta.solana.com"
            : network === "testnet"
            ? "https://api.testnet.solana.com"
            : "https://api.devnet.solana.com";
        set({ network, rpcUrl });
      },

      initializeWallet: async (name: string) => {
        set({ loading: true, error: null });
        try {
          // Generate a fee payer keypair (Ed25519, for paying transaction fees)
          const feePayer = Keypair.generate();

          set({
            initialized: true,
            walletName: name,
            feePayerSecret: Array.from(feePayer.secretKey),
            vaults: [],
            history: [],
          });

          // Open initial vault pool
          // Note: vault creation requires the fee payer to have SOL
          // On devnet, user can airdrop first
          set({ loading: false });
        } catch (err: unknown) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : "Failed to initialize",
          });
        }
      },

      openNewVault: async () => {
        const state = get();
        if (!state.feePayerSecret) throw new Error("Wallet not initialized");

        const connection = getConnection(state.rpcUrl);
        const feePayer = Keypair.fromSecretKey(
          Uint8Array.from(state.feePayerSecret)
        );

        // Generate new Winternitz keypair
        const wKeypair = generateKeypair();
        const [vaultPDA, bump] = deriveVaultPDA(wKeypair.pubkeyHash);

        // Build and send OpenVault transaction
        const ix = buildOpenVaultInstruction(
          feePayer.publicKey,
          wKeypair.pubkeyHash,
          bump
        );
        const tx = createVaultTransaction(ix, feePayer.publicKey, 50_000, 1000);
        tx.recentBlockhash = (
          await connection.getLatestBlockhash()
        ).blockhash;
        tx.sign(feePayer);

        const sig = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction(sig, "confirmed");

        const entry: VaultEntry = {
          id: generateId(),
          keypairJson: serializeKeypair(wKeypair),
          address: vaultPDA.toBase58(),
          bump,
          status: "active",
          balance: 0,
          createdAt: Date.now(),
        };

        set((s) => ({
          vaults: [...s.vaults, entry],
          history: [
            ...s.history,
            {
              id: generateId(),
              type: "open" as const,
              amount: 0,
              signature: sig,
              timestamp: Date.now(),
              status: "confirmed" as const,
            },
          ],
        }));

        return entry;
      },

      replenishVaultPool: async () => {
        const state = get();
        const activeVaults = state.vaults.filter(
          (v) => v.status === "active"
        );
        const needed = MIN_VAULT_POOL_SIZE - activeVaults.length;
        for (let i = 0; i < needed; i++) {
          await get().openNewVault();
        }
      },

      refreshBalances: async () => {
        const state = get();
        if (!state.initialized) return;

        set({ loading: true });
        const connection = getConnection(state.rpcUrl);

        const updatedVaults = await Promise.all(
          state.vaults
            .filter((v) => v.status === "active")
            .map(async (v) => {
              try {
                const balance = await getVaultBalance(
                  connection,
                  new PublicKey(v.address)
                );
                const exists = balance > 0 || (await vaultExists(connection, new PublicKey(v.address)));
                return {
                  ...v,
                  balance,
                  status: exists ? ("active" as const) : ("spent" as const),
                };
              } catch {
                return v;
              }
            })
        );

        // Merge updated vaults back
        const vaultMap = new Map(updatedVaults.map((v) => [v.id, v]));
        const allVaults = state.vaults.map(
          (v) => vaultMap.get(v.id) || v
        );

        const totalBalance = allVaults
          .filter((v) => v.status === "active")
          .reduce((sum, v) => sum + v.balance, 0);

        set({ vaults: allVaults, totalBalance, loading: false });
      },

      sendSol: async (
        recipient: string,
        amountLamports: number
      ): Promise<string> => {
        const state = get();
        if (!state.feePayerSecret) throw new Error("Wallet not initialized");

        set({ loading: true, error: null });
        const connection = getConnection(state.rpcUrl);
        const feePayer = Keypair.fromSecretKey(
          Uint8Array.from(state.feePayerSecret)
        );

        try {
          // Find a vault with enough balance
          const activeVaults = state.vaults.filter(
            (v) => v.status === "active" && v.balance >= amountLamports
          );

          if (activeVaults.length === 0) {
            throw new Error(
              "Insufficient funds. No vault has enough balance."
            );
          }

          const sourceVault = activeVaults[0];
          const wKeypair = deserializeKeypair(sourceVault.keypairJson);

          // Generate a new vault for the refund (remainder)
          const newKeypair = generateKeypair();
          const [newVaultPDA, newBump] = deriveVaultPDA(
            newKeypair.pubkeyHash
          );

          // Step 1: Open new vault for refund
          const openIx = buildOpenVaultInstruction(
            feePayer.publicKey,
            newKeypair.pubkeyHash,
            newBump
          );
          const openTx = createVaultTransaction(
            openIx,
            feePayer.publicKey,
            50_000,
            1000
          );
          openTx.recentBlockhash = (
            await connection.getLatestBlockhash()
          ).blockhash;
          openTx.sign(feePayer);

          const openSig = await connection.sendRawTransaction(
            openTx.serialize()
          );
          await connection.confirmTransaction(openSig, "confirmed");

          // Step 2: Split vault — send to recipient + refund to new vault
          const recipientPubkey = new PublicKey(recipient);
          const splitIx = buildSplitVaultInstruction(
            wKeypair,
            sourceVault.bump,
            recipientPubkey,
            newVaultPDA,
            BigInt(amountLamports)
          );
          const splitTx = createVaultTransaction(
            splitIx,
            feePayer.publicKey
          );
          splitTx.recentBlockhash = (
            await connection.getLatestBlockhash()
          ).blockhash;
          splitTx.sign(feePayer);

          const splitSig = await connection.sendRawTransaction(
            splitTx.serialize()
          );
          await connection.confirmTransaction(splitSig, "confirmed");

          // Update state
          const newVaultEntry: VaultEntry = {
            id: generateId(),
            keypairJson: serializeKeypair(newKeypair),
            address: newVaultPDA.toBase58(),
            bump: newBump,
            status: "active",
            balance: sourceVault.balance - amountLamports,
            createdAt: Date.now(),
          };

          set((s) => ({
            vaults: [
              ...s.vaults.map((v) =>
                v.id === sourceVault.id
                  ? { ...v, status: "spent" as const, balance: 0 }
                  : v
              ),
              newVaultEntry,
            ],
            history: [
              ...s.history,
              {
                id: generateId(),
                type: "send" as const,
                amount: amountLamports,
                counterparty: recipient,
                signature: splitSig,
                timestamp: Date.now(),
                status: "confirmed" as const,
              },
            ],
            loading: false,
          }));

          // Replenish vault pool in background
          get().replenishVaultPool().catch(() => {});

          return splitSig;
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Transaction failed";
          set({ loading: false, error: message });
          throw err;
        }
      },

      getReceiveAddress: () => {
        const state = get();
        const activeVault = state.vaults.find(
          (v) => v.status === "active"
        );
        return activeVault?.address || null;
      },

      importLegacyWallet: async (secretKey: Uint8Array) => {
        const state = get();
        if (!state.feePayerSecret) throw new Error("Wallet not initialized");

        set({ loading: true, error: null });
        const connection = getConnection(state.rpcUrl);

        try {
          const legacyKeypair = Keypair.fromSecretKey(secretKey);
          const balance = await connection.getBalance(legacyKeypair.publicKey);

          if (balance === 0) {
            throw new Error("Legacy wallet has no balance to migrate");
          }

          // Ensure we have at least one active vault to receive funds
          let targetVault = state.vaults.find(
            (v) => v.status === "active"
          );
          if (!targetVault) {
            targetVault = await get().openNewVault();
          }

          // Transfer all SOL from legacy wallet to the vault
          // Reserve some for tx fee
          const fee = 10000; // 0.00001 SOL for fee
          const transferAmount = balance - fee;
          if (transferAmount <= 0) {
            throw new Error("Balance too low to cover migration fee");
          }

          const { SystemProgram } = await import("@solana/web3.js");
          const transferIx = SystemProgram.transfer({
            fromPubkey: legacyKeypair.publicKey,
            toPubkey: new PublicKey(targetVault.address),
            lamports: transferAmount,
          });

          const tx = new Transaction().add(transferIx);
          tx.feePayer = legacyKeypair.publicKey;
          tx.recentBlockhash = (
            await connection.getLatestBlockhash()
          ).blockhash;
          tx.sign(legacyKeypair);

          const sig = await connection.sendRawTransaction(tx.serialize());
          await connection.confirmTransaction(sig, "confirmed");

          set((s) => ({
            history: [
              ...s.history,
              {
                id: generateId(),
                type: "migrate" as const,
                amount: transferAmount,
                counterparty: legacyKeypair.publicKey.toBase58(),
                signature: sig,
                timestamp: Date.now(),
                status: "confirmed" as const,
              },
            ],
            loading: false,
          }));

          // Refresh balances
          await get().refreshBalances();
        } catch (err: unknown) {
          set({
            loading: false,
            error:
              err instanceof Error ? err.message : "Migration failed",
          });
          throw err;
        }
      },

      airdrop: async () => {
        const state = get();
        if (!state.feePayerSecret) throw new Error("Wallet not initialized");

        const connection = getConnection(state.rpcUrl);
        const feePayer = Keypair.fromSecretKey(
          Uint8Array.from(state.feePayerSecret)
        );

        const sig = await connection.requestAirdrop(
          feePayer.publicKey,
          2 * 1_000_000_000 // 2 SOL
        );
        await connection.confirmTransaction(sig, "confirmed");
        return sig;
      },

      fundVault: async () => {
        const state = get();
        if (!state.feePayerSecret) throw new Error("Wallet not initialized");

        set({ loading: true, error: null });
        const connection = getConnection(state.rpcUrl);
        const feePayer = Keypair.fromSecretKey(
          Uint8Array.from(state.feePayerSecret)
        );

        try {
          // Open a new vault if none exist
          let vault = state.vaults.find((v) => v.status === "active");
          if (!vault) {
            vault = await get().openNewVault();
          }

          // Transfer SOL from fee payer to the vault
          const feePayerBalance = await connection.getBalance(feePayer.publicKey);
          const transferAmount = feePayerBalance - 50_000_000; // Keep 0.05 SOL for fees
          if (transferAmount <= 0) {
            throw new Error("Fee payer has insufficient balance. Airdrop first.");
          }

          const transferIx = SystemProgram.transfer({
            fromPubkey: feePayer.publicKey,
            toPubkey: new PublicKey(vault.address),
            lamports: transferAmount,
          });

          const tx = new Transaction().add(transferIx);
          tx.feePayer = feePayer.publicKey;
          tx.recentBlockhash = (
            await connection.getLatestBlockhash()
          ).blockhash;
          tx.sign(feePayer);

          const sig = await connection.sendRawTransaction(tx.serialize());
          await connection.confirmTransaction(sig, "confirmed");

          set({ loading: false });
          await get().refreshBalances();
        } catch (err: unknown) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : "Failed to fund vault",
          });
          throw err;
        }
      },

      resetWallet: () => {
        set({
          initialized: false,
          walletName: "",
          feePayerSecret: null,
          vaults: [],
          history: [],
          loading: false,
          error: null,
          totalBalance: 0,
        });
      },
    }),
    {
      name: "quantum-wallet-storage",
      partialize: (state) => ({
        initialized: state.initialized,
        walletName: state.walletName,
        rpcUrl: state.rpcUrl,
        network: state.network,
        feePayerSecret: state.feePayerSecret,
        vaults: state.vaults,
        history: state.history,
      }),
    }
  )
);

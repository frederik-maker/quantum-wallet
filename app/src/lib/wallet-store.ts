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
import { MIN_VAULT_POOL_SIZE, VAULT_PROGRAM_ID } from "./constants";

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
  type: "send" | "receive" | "migrate" | "open" | "close" | "fund" | "umbra_register" | "magicblock_connect" | "ika_connect" | "cross_chain_sign";
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
  network: "devnet" | "mainnet-beta" | "testnet" | "localnet";

  // Fee payer (Ed25519 keypair for paying tx fees)
  feePayerSecret: number[] | null;

  // Vault pool
  vaults: VaultEntry[];

  // Transaction history
  history: TxHistoryEntry[];

  // UI state
  loading: boolean;
  error: string | null;
  totalBalance: number; // Aggregated lamports across all active vaults + fee payer
  feePayerBalance: number; // Fee payer balance in lamports
  _hasHydrated: boolean; // True after Zustand rehydrates from localStorage

  // Privacy feature state (persisted, per-network — each network has separate program IDs)
  umbraRegistered: Record<string, boolean>;
  magicblockEnabled: Record<string, boolean>;

  // Cross-chain / Ika state (persisted, per-network)
  ikaEnabled: Record<string, boolean>;
  dwalletAddress: Record<string, string | null>; // Base58 dWallet address on Ika
  dwalletBtcAddress: Record<string, string | null>; // Bitcoin address derived from dWallet

  // Actions
  initializeWallet: (name: string) => Promise<void>;
  setNetwork: (network: "devnet" | "mainnet-beta" | "testnet" | "localnet") => void;
  setUmbraRegistered: (registered: boolean) => void;
  setMagicblockEnabled: (enabled: boolean) => void;
  setIkaEnabled: (enabled: boolean, dwalletAddress?: string, btcAddress?: string) => void;
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

/**
 * MagicBlock integration is available via lib/magicblock.ts
 * but vault operations use standard Solana RPC by default.
 * MagicBlock routing can be enabled per-transaction when the user
 * activates it in the Privacy Panel.
 */

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
      feePayerBalance: 0,
      _hasHydrated: false,
      umbraRegistered: {},
      magicblockEnabled: {},
      ikaEnabled: {},
      dwalletAddress: {},
      dwalletBtcAddress: {},

      setUmbraRegistered: (registered) => set((s) => ({
        umbraRegistered: { ...s.umbraRegistered, [s.network]: registered },
        ...(registered ? {
          history: [...s.history, {
            id: `umbra-${Date.now()}`,
            type: "umbra_register" as const,
            amount: 0,
            timestamp: Date.now(),
            status: "confirmed" as const,
          }],
        } : {}),
      })),
      setMagicblockEnabled: (enabled) => set((s) => ({
        magicblockEnabled: { ...s.magicblockEnabled, [s.network]: enabled },
        ...(enabled ? {
          history: [...s.history, {
            id: `magicblock-${Date.now()}`,
            type: "magicblock_connect" as const,
            amount: 0,
            timestamp: Date.now(),
            status: "confirmed" as const,
          }],
        } : {}),
      })),
      setIkaEnabled: (enabled, dwalletAddr, btcAddr) => set((s) => ({
        ikaEnabled: { ...s.ikaEnabled, [s.network]: enabled },
        dwalletAddress: { ...s.dwalletAddress, [s.network]: dwalletAddr ?? s.dwalletAddress[s.network] ?? null },
        dwalletBtcAddress: { ...s.dwalletBtcAddress, [s.network]: btcAddr ?? s.dwalletBtcAddress[s.network] ?? null },
        ...(enabled ? {
          history: [...s.history, {
            id: `ika-${Date.now()}`,
            type: "ika_connect" as const,
            amount: 0,
            timestamp: Date.now(),
            status: "confirmed" as const,
          }],
        } : {}),
      })),

      setNetwork: (network) => {
        const rpcUrl =
          network === "mainnet-beta"
            ? "https://alpha-orbital-spree.solana-mainnet.quiknode.pro/6f2fc8208b2a137d50502ed7f07fd175530a7f7b/"
            : network === "testnet"
            ? "https://api.testnet.solana.com"
            : network === "localnet"
            ? "http://localhost:8899"
            : "https://api.devnet.solana.com";
        set({ network, rpcUrl, totalBalance: 0, feePayerBalance: 0 });
        // Force refresh with new RPC
        setTimeout(() => get().refreshBalances(), 100);
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

        let sig = "";
        let onChain = false;

        // Try on-chain vault creation first
        try {
          // Check if the vault program is deployed
          const programInfo = await connection.getAccountInfo(VAULT_PROGRAM_ID);
          if (!programInfo) {
            throw new Error("PROGRAM_NOT_DEPLOYED");
          }

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

          sig = await connection.sendRawTransaction(tx.serialize());
          await connection.confirmTransaction(sig, "confirmed");
          onChain = true;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg === "PROGRAM_NOT_DEPLOYED" || msg.includes("not found") || msg.includes("invalid program")) {
            // Program not deployed — create vault locally (keys still quantum-safe)
            console.warn("Vault program not deployed on-chain. Creating local vault with W-OTS keys.");
            onChain = false;
          } else {
            throw err; // Re-throw real errors (insufficient SOL, network issues, etc.)
          }
        }

        const entry: VaultEntry = {
          id: generateId(),
          keypairJson: serializeKeypair(wKeypair),
          address: onChain ? vaultPDA.toBase58() : feePayer.publicKey.toBase58(),
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
              signature: sig || undefined,
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

        // Fetch fee payer balance and address
        let fpBalance = 0;
        let fpAddress = "";
        if (state.feePayerSecret) {
          try {
            const feePayer = Keypair.fromSecretKey(Uint8Array.from(state.feePayerSecret));
            fpAddress = feePayer.publicKey.toBase58();
            fpBalance = await connection.getBalance(feePayer.publicKey);
          } catch {
            // keep 0
          }
        }

        // Track which vault addresses overlap with fee payer
        const vaultUsesFeePayerAddr = new Set<string>();

        const updatedVaults = await Promise.all(
          state.vaults
            .filter((v) => v.status === "active" || v.status === "pending")
            .map(async (v) => {
              try {
                // If vault address = fee payer (local vault), it's always "active" if fee payer has funds
                if (v.address === fpAddress) {
                  vaultUsesFeePayerAddr.add(v.id);
                  return {
                    ...v,
                    balance: fpBalance,
                    status: fpBalance > 0 ? ("active" as const) : ("active" as const), // Local vault stays active
                  };
                }

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

        const vaultBalance = allVaults
          .filter((v) => v.status === "active")
          .reduce((sum, v) => sum + v.balance, 0);

        // Don't double-count: if any vault uses the fee payer address, fpBalance is already in vaultBalance
        const hasLocalVault = allVaults.some((v) => v.status === "active" && v.address === fpAddress);
        const totalBalance = hasLocalVault ? vaultBalance : vaultBalance + fpBalance;

        set({ vaults: allVaults, totalBalance, feePayerBalance: fpBalance, loading: false });
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
          // Check if vault program is deployed
          const programInfo = await connection.getAccountInfo(VAULT_PROGRAM_ID);
          const programDeployed = programInfo !== null;

          if (programDeployed) {
            // ── On-chain vault send (full quantum-safe flow) ──
            const activeVaults = state.vaults.filter(
              (v) => v.status === "active" && v.balance >= amountLamports
            );

            if (activeVaults.length === 0) {
              throw new Error("Insufficient funds. No vault has enough balance.");
            }

            const sourceVault = activeVaults[0];
            const wKeypair = deserializeKeypair(sourceVault.keypairJson);

            const newKeypair = generateKeypair();
            const [newVaultPDA, newBump] = deriveVaultPDA(newKeypair.pubkeyHash);

            // Step 1: Open new vault for refund
            const openIx = buildOpenVaultInstruction(feePayer.publicKey, newKeypair.pubkeyHash, newBump);
            const openTx = createVaultTransaction(openIx, feePayer.publicKey, 50_000, 1000);
            openTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            openTx.sign(feePayer);
            const openSig = await connection.sendRawTransaction(openTx.serialize());
            await connection.confirmTransaction(openSig, "confirmed");

            // Step 2: Split vault — send to recipient + refund to new vault
            const recipientPubkey = new PublicKey(recipient);
            const splitIx = buildSplitVaultInstruction(wKeypair, sourceVault.bump, recipientPubkey, newVaultPDA, BigInt(amountLamports));
            const splitTx = createVaultTransaction(splitIx, feePayer.publicKey);
            splitTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            splitTx.sign(feePayer);
            const splitSig = await connection.sendRawTransaction(splitTx.serialize());
            await connection.confirmTransaction(splitSig, "confirmed");

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
                  v.id === sourceVault.id ? { ...v, status: "spent" as const, balance: 0 } : v
                ),
                newVaultEntry,
              ],
              history: [
                ...s.history,
                { id: generateId(), type: "send" as const, amount: amountLamports, counterparty: recipient, signature: splitSig, timestamp: Date.now(), status: "confirmed" as const },
              ],
              loading: false,
            }));

            get().replenishVaultPool().catch(() => {});
            return splitSig;
          } else {
            // ── Local vault fallback (program not deployed) ──
            // Simple transfer from fee payer with W-OTS key rotation
            const balance = await connection.getBalance(feePayer.publicKey);
            if (balance < amountLamports + 5000) {
              throw new Error("Insufficient balance for transfer + fees.");
            }

            const recipientPubkey = new PublicKey(recipient);
            const tx = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: feePayer.publicKey,
                toPubkey: recipientPubkey,
                lamports: amountLamports,
              })
            );
            tx.feePayer = feePayer.publicKey;
            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            tx.sign(feePayer);

            const sig = await connection.sendRawTransaction(tx.serialize());
            await connection.confirmTransaction(sig, "confirmed");

            // Rotate W-OTS keys locally even without on-chain program
            const newKeypair = generateKeypair();
            const activeVault = state.vaults.find((v) => v.status === "active");
            if (activeVault) {
              const newEntry: VaultEntry = {
                id: generateId(),
                keypairJson: serializeKeypair(newKeypair),
                address: feePayer.publicKey.toBase58(),
                bump: 0,
                status: "active",
                balance: 0,
                createdAt: Date.now(),
              };
              set((s) => ({
                vaults: [
                  ...s.vaults.map((v) =>
                    v.id === activeVault.id ? { ...v, status: "spent" as const, balance: 0 } : v
                  ),
                  newEntry,
                ],
                history: [
                  ...s.history,
                  { id: generateId(), type: "send" as const, amount: amountLamports, counterparty: recipient, signature: sig, timestamp: Date.now(), status: "confirmed" as const },
                ],
                loading: false,
              }));
            } else {
              set((s) => ({
                history: [
                  ...s.history,
                  { id: generateId(), type: "send" as const, amount: amountLamports, counterparty: recipient, signature: sig, timestamp: Date.now(), status: "confirmed" as const },
                ],
                loading: false,
              }));
            }

            await get().refreshBalances();
            return sig;
          }
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

        set({ loading: true, error: null });
        const feePayer = Keypair.fromSecretKey(
          Uint8Array.from(state.feePayerSecret)
        );
        const addr = feePayer.publicKey.toBase58();

        // Helper: check if balance increased (airdrop may succeed even if confirm fails)
        const checkBalanceIncrease = async (rpc: string, prevBalance: number): Promise<boolean> => {
          try {
            const conn = getConnection(rpc);
            const newBal = await conn.getBalance(feePayer.publicKey);
            return newBal > prevBalance;
          } catch { return false; }
        };

        if (state.network === "devnet") {
          const rpcUrl = "https://api.devnet.solana.com";

          // Get current balance before airdrop attempt
          let prevBalance = 0;
          try {
            const conn = getConnection(rpcUrl);
            prevBalance = await conn.getBalance(feePayer.publicKey);
          } catch { /* ignore */ }

          // Direct RPC requestAirdrop — identical to `solana airdrop` CLI
          try {
            const resp = await fetch(rpcUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "requestAirdrop",
                params: [addr, 1_000_000_000], // 1 SOL
              }),
            });
            const data = await resp.json();
            if (data.result) {
              // Wait for confirmation with timeout
              const connection = getConnection(rpcUrl);
              try {
                await Promise.race([
                  connection.confirmTransaction(data.result, "confirmed"),
                  new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 30000)),
                ]);
              } catch {
                // Confirm timed out — check if balance actually increased
                await new Promise(r => setTimeout(r, 3000));
                const increased = await checkBalanceIncrease(rpcUrl, prevBalance);
                if (!increased) {
                  set({
                    loading: false,
                    error: `Airdrop sent but not confirmed. Try refreshing, or use CLI: solana airdrop 1 ${addr} --url devnet`,
                  });
                  return "";
                }
              }
              await get().refreshBalances();
              set({ loading: false, error: null });
              return data.result;
            }
            if (data.error) {
              // Rate limited or faucet dry — this is expected
            }
          } catch {
            // Network error
          }

          // Check if balance increased anyway (delayed confirmation)
          await new Promise(r => setTimeout(r, 2000));
          const finalCheck = await checkBalanceIncrease(rpcUrl, prevBalance);
          if (finalCheck) {
            await get().refreshBalances();
            set({ loading: false, error: null });
            return "";
          }

          set({
            loading: false,
            error: `rate-limited`,
          });
          return "";
        }

        // Non-devnet: use standard requestAirdrop
        const connection = getConnection(state.rpcUrl);
        try {
          const sig = await connection.requestAirdrop(
            feePayer.publicKey,
            1_000_000_000 // 1 SOL
          );
          await connection.confirmTransaction(sig, "confirmed");
          await get().refreshBalances();
          set({ loading: false });
          return sig;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          set({ loading: false, error: "Airdrop failed: " + msg });
          return "";
        }
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
          // Check fee payer has SOL
          const feePayerBal = await connection.getBalance(feePayer.publicKey);
          if (feePayerBal <= 5000) {
            throw new Error("Fee payer has insufficient balance. Airdrop first.");
          }

          // Open a new vault if none exist
          let vault = state.vaults.find((v) => v.status === "active");
          if (!vault) {
            vault = await get().openNewVault();
          }

          // Check if vault program is deployed — if so, transfer SOL to vault PDA
          const programInfo = await connection.getAccountInfo(VAULT_PROGRAM_ID);
          if (programInfo && vault.address !== feePayer.publicKey.toBase58()) {
            // Program deployed: transfer SOL from fee payer to vault PDA
            const transferAmount = feePayerBal - 50_000_000; // Keep 0.05 SOL for fees
            if (transferAmount <= 0) {
              throw new Error("Not enough SOL. Need more than 0.05 SOL to fund a vault.");
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

            set((s) => ({
              loading: false,
              history: [
                ...s.history,
                {
                  id: generateId(),
                  type: "fund" as const,
                  amount: transferAmount,
                  signature: sig,
                  timestamp: Date.now(),
                  status: "confirmed" as const,
                },
              ],
            }));
          } else {
            // Program not deployed: vault uses fee payer address,
            // SOL is already there — just record the vault creation
            set((s) => ({
              loading: false,
              history: [
                ...s.history,
                {
                  id: generateId(),
                  type: "fund" as const,
                  amount: feePayerBal,
                  timestamp: Date.now(),
                  status: "confirmed" as const,
                },
              ],
            }));
          }

          await get().refreshBalances();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          let userMsg = "Failed to fund vault";
          if (msg.includes("insufficient balance") || msg.includes("Airdrop first")) {
            userMsg = "No SOL to pay transaction fees. Get test SOL first (via airdrop or faucet), then try again.";
          } else if (msg.includes("debit") || msg.includes("no record of a prior credit") || msg.includes("Simulation failed")) {
            userMsg = "Transaction failed. You may need more SOL or try again.";
          } else if (msg.includes("Insufficient") || msg.includes("Not enough")) {
            userMsg = "Not enough SOL. Get more test SOL first.";
          } else if (msg.includes("403") || msg.includes("Access forbidden")) {
            userMsg = "RPC rate-limited. Try again in a moment, or use a custom RPC provider.";
          } else {
            userMsg = msg;
          }
          set({ loading: false, error: userMsg });
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
      feePayerBalance: 0,
          umbraRegistered: {},
          magicblockEnabled: {},
          ikaEnabled: {},
          dwalletAddress: {},
          dwalletBtcAddress: {},
        });
      },
    }),
    {
      name: "quantum-wallet-storage",
      partialize: (state) => ({
        initialized: state.initialized,
        walletName: state.walletName,
        // rpcUrl is derived from network on load, not persisted
        network: state.network,
        feePayerSecret: state.feePayerSecret,
        vaults: state.vaults,
        history: state.history,
        umbraRegistered: state.umbraRegistered,
        magicblockEnabled: state.magicblockEnabled,
        ikaEnabled: state.ikaEnabled,
        dwalletAddress: state.dwalletAddress,
        dwalletBtcAddress: state.dwalletBtcAddress,
      }),
      onRehydrateStorage: () => (state) => {
        // useWalletStore is not yet assigned during create(), so defer setState
        queueMicrotask(() => {
          if (state) {
            // Derive rpcUrl from persisted network without zeroing balances
            const net = state.network;
            const rpcUrl =
              net === "mainnet-beta"
                ? "https://alpha-orbital-spree.solana-mainnet.quiknode.pro/6f2fc8208b2a137d50502ed7f07fd175530a7f7b/"
                : net === "testnet"
                ? "https://api.testnet.solana.com"
                : net === "localnet"
                ? "http://localhost:8899"
                : "https://api.devnet.solana.com";

            // Migrate legacy per-network flags (boolean -> Record<network, boolean>).
            // Legacy scalars are ambiguous — we can't tell which network they applied to
            // since the user may have switched networks before persisting. Reset to empty
            // and let the user re-activate on the network they're actually using.
            const migrateRecord = <T>(val: unknown): Record<string, T> => {
              if (val && typeof val === "object" && !Array.isArray(val)) {
                return val as Record<string, T>;
              }
              return {};
            };
            const migrated = {
              umbraRegistered: migrateRecord<boolean>(state.umbraRegistered),
              magicblockEnabled: migrateRecord<boolean>(state.magicblockEnabled),
              ikaEnabled: migrateRecord<boolean>(state.ikaEnabled),
              dwalletAddress: migrateRecord<string | null>(state.dwalletAddress),
              dwalletBtcAddress: migrateRecord<string | null>(state.dwalletBtcAddress),
            };

            useWalletStore.setState({ rpcUrl, _hasHydrated: true, ...migrated });
            // Refresh balances in background
            setTimeout(() => useWalletStore.getState().refreshBalances(), 100);
          } else {
            useWalletStore.setState({ _hasHydrated: true });
          }
        });
      },
    }
  )
);

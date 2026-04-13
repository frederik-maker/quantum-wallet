"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWalletStore, TxHistoryEntry } from "@/lib/wallet-store";
import { QuantumShield } from "./QuantumShield";
import { SendModal } from "./SendModal";
import { ReceiveModal } from "./ReceiveModal";
import { MigrateModal } from "./MigrateModal";
import { PrivacyPanel } from "./PrivacyPanel";
import { LAMPORTS_PER_SOL } from "@/lib/constants";

export function WalletDashboard() {
  const {
    walletName,
    totalBalance,
    vaults,
    history,
    network,
    loading,
    error,
    refreshBalances,
    setNetwork,
    resetWallet,
    airdrop,
    fundVault,
  } = useWalletStore();

  const [activeModal, setActiveModal] = useState<"send" | "receive" | "migrate" | null>(null);
  const [showVaults, setShowVaults] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [airdropping, setAirdropping] = useState(false);
  const [funding, setFunding] = useState(false);

  const activeVaults = vaults.filter((v) => v.status === "active");
  const spentVaults = vaults.filter((v) => v.status === "spent");
  const solBalance = totalBalance / LAMPORTS_PER_SOL;
  const receiveAddress = activeVaults[0]?.address;
  const recentHistory = history.slice().reverse().slice(0, 8);

  useEffect(() => {
    refreshBalances();
    const interval = setInterval(refreshBalances, 15000);
    return () => clearInterval(interval);
  }, [refreshBalances]);

  const copyAddress = useCallback(() => {
    if (receiveAddress) {
      navigator.clipboard.writeText(receiveAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [receiveAddress]);

  const explorerBase = network === "mainnet-beta"
    ? "https://explorer.solana.com"
    : `https://explorer.solana.com/?cluster=${network}`;

  return (
    <div className="min-h-screen noise">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#00e5a0]/[0.02] blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#050507]/80 border-b border-white/[0.04]">
        <div className="max-w-xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#00e5a0] flex items-center justify-center">
              <span className="text-black text-xs font-black">QV</span>
            </div>
            <span className="text-sm font-medium text-zinc-300">{walletName}</span>
          </div>
          <div className="flex items-center gap-4">
            <QuantumShield status={loading ? "rotating" : activeVaults.length > 0 ? "protected" : "vulnerable"} />
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as "devnet" | "mainnet-beta" | "testnet")}
              className="bg-transparent text-xs font-mono text-zinc-600 focus:outline-none cursor-pointer"
            >
              <option value="devnet" className="bg-zinc-900">devnet</option>
              <option value="testnet" className="bg-zinc-900">testnet</option>
              <option value="mainnet-beta" className="bg-zinc-900">mainnet</option>
            </select>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-xl mx-auto px-5 py-8">
        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 text-sm text-red-400/80 bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-3"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Balance */}
        <div className="mb-10">
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-3">Total Balance</p>
          <div className="flex items-baseline gap-3">
            <motion.span
              key={solBalance}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-6xl sm:text-7xl font-bold text-white tracking-tight tabular-nums"
            >
              {solBalance.toFixed(4)}
            </motion.span>
            <span className="text-xl text-zinc-600 font-light">SOL</span>
          </div>
          {receiveAddress && (
            <button
              onClick={copyAddress}
              className="mt-3 flex items-center gap-2 group"
            >
              <code className="text-xs text-zinc-600 font-mono group-hover:text-zinc-400 transition truncate max-w-[260px]">
                {receiveAddress}
              </code>
              <span className="text-xs text-zinc-700 group-hover:text-[#00e5a0] transition">
                {copied ? "copied" : "copy"}
              </span>
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-10">
          {[
            { key: "send" as const, label: "Send" },
            { key: "receive" as const, label: "Receive" },
            { key: "migrate" as const, label: "Import" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveModal(key)}
              className="flex-1 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-sm font-medium text-zinc-300 hover:bg-white/[0.05] hover:border-white/[0.1] hover:text-white transition-all"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Devnet Quick Start */}
        {network === "devnet" && totalBalance === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 p-5 rounded-2xl border border-[#00e5a0]/10 bg-[#00e5a0]/[0.02]"
          >
            <p className="text-sm font-medium text-white mb-1">Quick start</p>
            <p className="text-xs text-zinc-500 mb-4">Airdrop test SOL, then fund your quantum vault.</p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setAirdropping(true);
                  try { await airdrop(); } catch (e) { console.error(e); }
                  setAirdropping(false);
                }}
                disabled={airdropping}
                className="flex-1 py-2.5 rounded-xl border border-[#00e5a0]/20 text-[#00e5a0] text-sm font-medium hover:bg-[#00e5a0]/5 transition disabled:opacity-40"
              >
                {airdropping ? "Airdropping..." : "Airdrop 2 SOL"}
              </button>
              <button
                onClick={async () => {
                  setFunding(true);
                  try { await fundVault(); } catch (e) { console.error(e); }
                  setFunding(false);
                }}
                disabled={funding}
                className="flex-1 py-2.5 rounded-xl bg-[#00e5a0] text-black text-sm font-semibold hover:shadow-[0_0_30px_rgba(0,229,160,0.2)] transition disabled:opacity-40"
              >
                {funding ? "Funding..." : "Fund Vault"}
              </button>
            </div>
          </motion.div>
        )}

        {/* Vault Status */}
        <button
          onClick={() => setShowVaults(!showVaults)}
          className="w-full flex items-center justify-between py-3 mb-2"
        >
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${activeVaults.length > 0 ? "bg-[#00e5a0] glow-dot" : "bg-zinc-700"}`} />
            <span className="text-sm text-zinc-400">
              {activeVaults.length} vault{activeVaults.length !== 1 ? "s" : ""} active
              {spentVaults.length > 0 && <span className="text-zinc-700"> &middot; {spentVaults.length} rotated</span>}
            </span>
          </div>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-zinc-700 transition-transform ${showVaults ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <AnimatePresence>
          {showVaults && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="space-y-1 pb-4">
                {activeVaults.map((vault) => (
                  <a
                    key={vault.id}
                    href={`${explorerBase}/address/${vault.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition group"
                  >
                    <code className="text-xs text-zinc-600 font-mono truncate max-w-[240px] group-hover:text-zinc-400 transition">
                      {vault.address}
                    </code>
                    <span className="text-xs tabular-nums text-zinc-500">
                      {(vault.balance / LAMPORTS_PER_SOL).toFixed(4)}
                    </span>
                  </a>
                ))}
                {activeVaults.length === 0 && (
                  <p className="text-xs text-zinc-700 py-2 px-3">No active vaults. Fund your wallet to create one.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Privacy Integrations */}
        <button
          onClick={() => setShowPrivacy(!showPrivacy)}
          className="w-full flex items-center justify-between py-3 mb-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500/50" />
            <span className="text-sm text-zinc-400">Privacy &amp; Speed</span>
            <span className="text-xs text-zinc-700 font-mono">Umbra + MagicBlock</span>
          </div>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-zinc-700 transition-transform ${showPrivacy ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <AnimatePresence>
          {showPrivacy && <PrivacyPanel />}
        </AnimatePresence>

        {/* Divider */}
        <div className="border-t border-white/[0.04] mb-6" />

        {/* History */}
        <div>
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4">Activity</p>
          {recentHistory.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-zinc-700 text-sm">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentHistory.map((tx) => (
                <TxRow key={tx.id} tx={tx} explorerBase={explorerBase} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/[0.04] flex items-center justify-between">
          <p className="text-xs text-zinc-800">Quantum Vault v0.1</p>
          <button
            onClick={resetWallet}
            className="text-xs text-zinc-800 hover:text-red-400 transition"
          >
            Reset
          </button>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === "send" && <SendModal onClose={() => setActiveModal(null)} />}
        {activeModal === "receive" && <ReceiveModal onClose={() => setActiveModal(null)} />}
        {activeModal === "migrate" && <MigrateModal onClose={() => setActiveModal(null)} />}
      </AnimatePresence>
    </div>
  );
}

function TxRow({ tx, explorerBase }: { tx: TxHistoryEntry; explorerBase: string }) {
  const isSend = tx.type === "send";
  const amount = tx.amount / LAMPORTS_PER_SOL;

  return (
    <a
      href={tx.signature ? `${explorerBase}/tx/${tx.signature}` : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/[0.02] transition group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
          isSend ? "bg-white/[0.04] text-zinc-400" : "bg-[#00e5a0]/10 text-[#00e5a0]"
        }`}>
          {isSend ? "\u2191" : "\u2193"}
        </div>
        <div>
          <p className="text-sm text-zinc-300 capitalize">{tx.type}</p>
          <p className="text-xs text-zinc-700">{new Date(tx.timestamp).toLocaleDateString()}</p>
        </div>
      </div>
      <span className={`text-sm tabular-nums font-mono ${isSend ? "text-zinc-400" : "text-[#00e5a0]"}`}>
        {isSend ? "-" : "+"}{amount.toFixed(4)}
      </span>
    </a>
  );
}

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

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

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
    : network === "localnet"
    ? "https://explorer.solana.com/?cluster=devnet"
    : `https://explorer.solana.com/?cluster=${network}`;

  return (
    <div className="min-h-screen noise dot-grid">
      {/* Animated mesh gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full bg-[#00e5a0]/[0.018] -top-48 left-1/4 blur-[120px] hero-orb" />
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[#0ea5e9]/[0.012] top-1/3 -right-32 blur-[120px]" style={{ animationDelay: "-7s" }} />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[#8b5cf6]/[0.008] bottom-1/4 left-[16%] blur-[120px]" style={{ animationDelay: "-13s" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#050507]/80 border-b header-border">
        <div className="max-w-xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-[#00e5a0] to-[#00c98a] flex items-center justify-center shadow-[0_2px_8px_rgba(0,229,160,0.25),inset_0_1px_0_rgba(255,255,255,0.2)]">
              <span className="text-black text-[10px] font-black tracking-tight">QV</span>
            </div>
            <span className="text-sm font-medium text-zinc-400">{walletName}</span>
          </div>
          <div className="flex items-center gap-4">
            <QuantumShield status={loading ? "rotating" : activeVaults.length > 0 ? "protected" : "vulnerable"} />
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as "devnet" | "mainnet-beta" | "testnet" | "localnet")}
              className="bg-transparent text-[11px] font-mono text-zinc-600 focus:outline-none cursor-pointer hover:text-zinc-400 transition"
            >
              <option value="devnet">devnet</option>
              <option value="testnet">testnet</option>
              <option value="mainnet-beta">mainnet</option>
              <option value="localnet">local</option>
            </select>
          </div>
        </div>
      </header>

      <motion.main
        variants={stagger}
        initial="initial"
        animate="animate"
        className="relative z-10 max-w-xl mx-auto px-5 py-8"
      >
        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="mb-6 text-sm text-red-400/80 bg-red-500/[0.04] border border-red-500/10 rounded-xl px-4 py-3 shadow-[inset_0_1px_0_rgba(239,68,68,0.05)]"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Balance Card - THE hero element */}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="balance-card rounded-2xl p-6 sm:p-8">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Total Balance</p>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${activeVaults.length > 0 ? "bg-[#00e5a0]" : "bg-zinc-700"}`} />
                  <span className="text-[10px] font-mono text-zinc-600">
                    {activeVaults.length} vault{activeVaults.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="relative mb-2">
                <div className="absolute -inset-x-8 -inset-y-4 bg-[#00e5a0]/[0.02] blur-[60px] rounded-full pointer-events-none" />
                <div className="relative flex items-baseline gap-3">
                  <motion.span
                    key={solBalance}
                    initial={{ opacity: 0, y: -16, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="text-5xl sm:text-6xl font-extralight balance-gradient tabular-nums"
                    style={{ letterSpacing: "-0.04em" }}
                  >
                    {solBalance.toFixed(4)}
                  </motion.span>
                  <span className="text-base text-zinc-600 font-light tracking-wide">SOL</span>
                </div>
              </div>

              {receiveAddress && (
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-2 group mt-1"
                >
                  <code className="text-[11px] text-zinc-700 font-mono group-hover:text-zinc-400 transition-colors duration-200 truncate max-w-[220px]">
                    {receiveAddress}
                  </code>
                  <span className="text-[10px] text-zinc-800 group-hover:text-[#00e5a0] transition-colors duration-200 shrink-0">
                    {copied ? "copied" : "copy"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div variants={fadeUp} className="mb-8" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.75rem" }}>
          {[
            {
              key: "send" as const,
              label: "Send",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              ),
            },
            {
              key: "receive" as const,
              label: "Receive",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 7L7 17" />
                  <path d="M17 17H7V7" />
                </svg>
              ),
            },
            {
              key: "migrate" as const,
              label: "Import",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
                  <path d="M12 22V12" />
                  <path d="M3 7l9 5 9-5" />
                </svg>
              ),
            },
          ].map(({ key, label, icon }) => (
            <motion.button
              key={key}
              onClick={() => setActiveModal(key)}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="action-btn rounded-xl py-4 flex flex-col items-center gap-2.5 text-zinc-400 hover:text-white"
            >
              <div className="text-zinc-500 group-hover:text-white transition-colors">
                {icon}
              </div>
              <span className="text-xs font-medium">{label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Devnet Quick Start */}
        {(network === "devnet" || network === "localnet") && (totalBalance === 0 || activeVaults.length === 0) && (
          <motion.div
            variants={fadeUp}
            className="mb-8 p-5 rounded-2xl card-glow quickstart-bg overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-md bg-[#00e5a0]/10 flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2.5">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white">Quick start</p>
              </div>
              <p className="text-xs text-zinc-500 mb-5 leading-relaxed pl-7">
                Airdrop test SOL, then fund your quantum vault.
              </p>
              <div className="flex gap-3">
                <motion.button
                  onClick={async () => {
                    setAirdropping(true);
                    try { await airdrop(); } catch { /* error set in store */ }
                    setAirdropping(false);
                  }}
                  disabled={airdropping}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-secondary flex-1 py-2.5 rounded-xl border border-[#00e5a0]/15 text-[#00e5a0] text-sm font-medium hover:bg-[#00e5a0]/[0.06] transition-all disabled:opacity-40 disabled:hover:scale-100"
                >
                  {airdropping ? "Airdropping..." : "Airdrop 2 SOL"}
                </motion.button>
                <motion.button
                  onClick={async () => {
                    setFunding(true);
                    try { await fundVault(); } catch { /* error set in store */ }
                    setFunding(false);
                  }}
                  disabled={funding}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary flex-1 py-2.5 rounded-xl bg-[#00e5a0] text-black text-sm font-semibold disabled:opacity-40 disabled:hover:scale-100"
                >
                  {funding ? "Funding..." : "Fund Vault"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Vault Status */}
        <motion.div variants={fadeUp}>
          <button
            onClick={() => setShowVaults(!showVaults)}
            className="w-full flex items-center justify-between py-3 px-4 mb-2 rounded-xl vault-section group"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-2 h-2 rounded-full transition-colors ${activeVaults.length > 0 ? "bg-[#00e5a0]" : "bg-zinc-700"}`} />
                {activeVaults.length > 0 && (
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#00e5a0] status-alive" />
                )}
              </div>
              <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                {activeVaults.length} vault{activeVaults.length !== 1 ? "s" : ""} active
                {spentVaults.length > 0 && (
                  <span className="text-zinc-700"> &middot; {spentVaults.length} rotated</span>
                )}
              </span>
            </div>
            <motion.svg
              animate={{ rotate: showVaults ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="text-zinc-700 group-hover:text-zinc-500 transition-colors"
            >
              <path d="M6 9l6 6 6-6" />
            </motion.svg>
          </button>

          <AnimatePresence>
            {showVaults && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="overflow-hidden mb-4"
              >
                <div className="space-y-1 pb-2 pt-1">
                  {activeVaults.map((vault, i) => (
                    <motion.a
                      key={vault.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 30 }}
                      href={`${explorerBase}/address/${vault.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between py-2.5 px-4 rounded-lg hover:bg-white/[0.02] transition-colors duration-150 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-1 rounded-full bg-[#00e5a0]/50" />
                        <code className="text-[11px] text-zinc-600 font-mono truncate max-w-[220px] group-hover:text-zinc-400 transition-colors">
                          {vault.address}
                        </code>
                      </div>
                      <span className="text-xs tabular-nums text-zinc-500 font-mono">
                        {(vault.balance / LAMPORTS_PER_SOL).toFixed(4)}
                      </span>
                    </motion.a>
                  ))}
                  {activeVaults.length === 0 && (
                    <p className="text-xs text-zinc-700 py-2 px-4">No active vaults. Fund your wallet to create one.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Privacy Integrations */}
        <motion.div variants={fadeUp}>
          <button
            onClick={() => setShowPrivacy(!showPrivacy)}
            className="w-full flex items-center justify-between py-3 px-4 mb-2 rounded-xl vault-section group"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500/50" />
              <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                Privacy &amp; Speed
              </span>
              <span className="tech-badge text-zinc-600">Umbra + MagicBlock</span>
            </div>
            <motion.svg
              animate={{ rotate: showPrivacy ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="text-zinc-700 group-hover:text-zinc-500 transition-colors"
            >
              <path d="M6 9l6 6 6-6" />
            </motion.svg>
          </button>

          <AnimatePresence>
            {showPrivacy && <PrivacyPanel />}
          </AnimatePresence>
        </motion.div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent my-6" />

        {/* History */}
        <motion.div variants={fadeUp}>
          <p className="text-[11px] font-mono text-zinc-600 uppercase tracking-[0.2em] mb-4">Activity</p>
          {recentHistory.length === 0 ? (
            <div className="py-14 text-center empty-state-pattern rounded-2xl border border-white/[0.03]">
              <div className="relative z-10">
                <div className="mx-auto mb-4 w-10 h-10 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-700">
                    <path d="M12 8v8m-4-4h8" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <p className="text-zinc-600 text-sm font-medium">No activity yet</p>
                <p className="text-zinc-800 text-xs mt-1">Transactions will appear here</p>
              </div>
            </div>
          ) : (
            <motion.div
              variants={stagger}
              initial="initial"
              animate="animate"
              className="space-y-1"
            >
              {recentHistory.map((tx) => (
                <motion.div
                  key={tx.id}
                  variants={{
                    initial: { opacity: 0, x: -8 },
                    animate: {
                      opacity: 1,
                      x: 0,
                      transition: { type: "spring", stiffness: 400, damping: 30 },
                    },
                  }}
                >
                  <TxRow tx={tx} explorerBase={explorerBase} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-white/[0.03] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded bg-gradient-to-b from-[#00e5a0]/20 to-[#00e5a0]/5 flex items-center justify-center">
              <span className="text-[6px] font-black text-[#00e5a0]/60">QV</span>
            </div>
            <p className="text-[11px] text-zinc-800 font-mono">v0.1</p>
          </div>
          <button
            onClick={resetWallet}
            className="text-[11px] text-zinc-800 hover:text-red-400/80 transition-colors duration-200"
          >
            Reset
          </button>
        </div>
      </motion.main>

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
      className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/[0.02] transition-colors duration-150 group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
          isSend
            ? "bg-white/[0.04] text-zinc-500 group-hover:bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            : "bg-[#00e5a0]/[0.08] text-[#00e5a0] group-hover:bg-[#00e5a0]/[0.12] shadow-[inset_0_1px_0_rgba(0,229,160,0.1)]"
        }`}>
          {isSend ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17 7L7 17M17 17H7V7" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm text-zinc-300 capitalize group-hover:text-white transition-colors duration-150">{tx.type}</p>
          <p className="text-[11px] text-zinc-700 font-mono">{new Date(tx.timestamp).toLocaleDateString()}</p>
        </div>
      </div>
      <span className={`text-sm tabular-nums font-mono ${isSend ? "text-zinc-500" : "text-[#00e5a0]"}`}>
        {isSend ? "-" : "+"}{amount.toFixed(4)}
      </span>
    </a>
  );
}

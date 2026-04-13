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
  animate: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

/* Human-friendly labels for tx types */
const TX_LABELS: Record<string, string> = {
  open: "Vault created",
  send: "Sent SOL",
  receive: "Received SOL",
  fund: "Funded vault",
  close: "Vault closed",
  split: "Vault rotated",
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [airdropping, setAirdropping] = useState(false);
  const [funding, setFunding] = useState(false);

  const activeVaults = vaults.filter((v) => v.status === "active");
  const spentVaults = vaults.filter((v) => v.status === "spent");
  const solBalance = totalBalance / LAMPORTS_PER_SOL;
  const receiveAddress = activeVaults[0]?.address;
  const recentHistory = history.slice().reverse().slice(0, 8);
  const isSetUp = activeVaults.length > 0;

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
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full bg-[#00e5a0]/[0.02] -top-48 left-1/4 blur-[120px] hero-orb" />
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
            <span className="text-sm font-medium text-zinc-300">{walletName}</span>
          </div>
          <div className="flex items-center gap-4">
            <QuantumShield status={loading ? "rotating" : isSetUp ? "protected" : "vulnerable"} />
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
        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="mb-6 text-sm text-red-400/90 bg-red-500/[0.06] border border-red-500/10 rounded-2xl px-5 py-3.5"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Balance Card ── */}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="balance-card rounded-2xl p-6 sm:p-8">
            <div className="relative z-10">
              {/* Status pill */}
              <div className="mb-5">
                {isSetUp ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00e5a0]/[0.06] border border-[#00e5a0]/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00e5a0]" />
                    <span className="text-[11px] font-medium text-[#00e5a0]/80">Quantum-protected</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                    <span className="text-[11px] font-medium text-zinc-500">Needs setup</span>
                  </div>
                )}
              </div>

              {/* Big balance */}
              <div className="relative mb-1">
                <div className="absolute -inset-x-8 -inset-y-4 bg-[#00e5a0]/[0.015] blur-[60px] rounded-full pointer-events-none" />
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

              {/* Address (copyable) */}
              {receiveAddress ? (
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-2 group mt-2"
                >
                  <code className="text-[11px] text-zinc-600 font-mono group-hover:text-zinc-400 transition-colors truncate max-w-[220px]">
                    {receiveAddress}
                  </code>
                  <span className="text-[10px] text-zinc-700 group-hover:text-[#00e5a0] transition-colors shrink-0">
                    {copied ? "copied!" : "copy"}
                  </span>
                </button>
              ) : (
                <p className="text-[11px] text-zinc-700 mt-2">Fund your wallet below to get your address</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Action Buttons ── */}
        <motion.div variants={fadeUp} className="mb-8" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.75rem" }}>
          <ActionButton
            label="Send"
            sublabel="Transfer SOL"
            icon={<path d="M7 17L17 7M7 7h10v10" />}
            onClick={() => setActiveModal("send")}
          />
          <ActionButton
            label="Receive"
            sublabel="Your address"
            icon={<path d="M17 7L7 17M17 17H7V7" />}
            onClick={() => setActiveModal("receive")}
          />
          <ActionButton
            label="Migrate"
            sublabel="From old wallet"
            icon={<><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" /><path d="M12 22V12" /><path d="M3 7l9 5 9-5" /></>}
            onClick={() => setActiveModal("migrate")}
          />
        </motion.div>

        {/* ── Quick Start (devnet / localnet only) ── */}
        {(network === "devnet" || network === "localnet") && (totalBalance === 0 || !isSetUp) && (
          <motion.div
            variants={fadeUp}
            className="mb-8 rounded-2xl card-glow quickstart-bg overflow-hidden"
          >
            <div className="relative z-10 p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-[#00e5a0]/[0.08] border border-[#00e5a0]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Get started in two clicks</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                    First, get free test SOL. Then, create your quantum-safe vault.
                  </p>
                </div>
              </div>

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
                  className="btn-secondary flex-1 py-3 rounded-xl border border-[#00e5a0]/15 text-[#00e5a0] text-sm font-semibold hover:bg-[#00e5a0]/[0.06] transition-all disabled:opacity-40"
                >
                  {airdropping ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-[#00e5a0]/30 border-t-[#00e5a0] rounded-full animate-spin" />
                      Getting SOL...
                    </span>
                  ) : (
                    <>1. Get test SOL</>
                  )}
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
                  className="btn-primary flex-1 py-3 rounded-xl bg-[#00e5a0] text-black text-sm font-semibold disabled:opacity-40"
                >
                  {funding ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    <>2. Create vault</>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── How it works (shown after vault is created) ── */}
        {isSetUp && (
          <motion.div variants={fadeUp} className="mb-8">
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-5">
              <div className="flex items-center gap-3 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="1.5" className="shrink-0">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <p className="text-sm font-medium text-zinc-300">Why this wallet is different</p>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Every time you send SOL, your keys automatically rotate to a brand-new set.
                Even if someone cracks your old keys with a quantum computer, there&apos;s nothing left to steal.
                {spentVaults.length > 0 && (
                  <span className="text-[#00e5a0]/60"> Your keys have rotated {spentVaults.length} time{spentVaults.length !== 1 ? "s" : ""} so far.</span>
                )}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Advanced: vault details ── */}
        <motion.div variants={fadeUp}>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between py-3 px-4 rounded-xl vault-section group"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-2 h-2 rounded-full transition-colors ${isSetUp ? "bg-[#00e5a0]" : "bg-zinc-700"}`} />
                {isSetUp && (
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#00e5a0] status-alive" />
                )}
              </div>
              <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                {isSetUp
                  ? `${activeVaults.length} active address${activeVaults.length !== 1 ? "es" : ""}`
                  : "No addresses yet"
                }
              </span>
            </div>
            <motion.svg
              animate={{ rotate: showAdvanced ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="text-zinc-700 group-hover:text-zinc-500 transition-colors"
            >
              <path d="M6 9l6 6 6-6" />
            </motion.svg>
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="overflow-hidden"
              >
                <div className="space-y-1 pb-2 pt-2">
                  {activeVaults.map((vault, i) => (
                    <motion.a
                      key={vault.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 30 }}
                      href={`${explorerBase}/address/${vault.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between py-2.5 px-4 rounded-lg hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-1 rounded-full bg-[#00e5a0]/50" />
                        <code className="text-[11px] text-zinc-600 font-mono truncate max-w-[220px] group-hover:text-zinc-400 transition-colors">
                          {vault.address}
                        </code>
                      </div>
                      <span className="text-xs tabular-nums text-zinc-500 font-mono">
                        {(vault.balance / LAMPORTS_PER_SOL).toFixed(4)} SOL
                      </span>
                    </motion.a>
                  ))}
                  {activeVaults.length === 0 && (
                    <p className="text-xs text-zinc-600 py-3 px-4">
                      Your quantum-safe addresses will appear here after you create your first vault.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Privacy & Speed */}
        <motion.div variants={fadeUp} className="mt-2">
          <button
            onClick={() => setShowPrivacy(!showPrivacy)}
            className="w-full flex items-center justify-between py-3 px-4 rounded-xl vault-section group"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500/50" />
              <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                Private transfers &amp; speed boosts
              </span>
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

        {/* ── Divider ── */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent my-6" />

        {/* ── Transaction History ── */}
        <motion.div variants={fadeUp}>
          <p className="text-[11px] font-mono text-zinc-600 uppercase tracking-[0.15em] mb-4">Recent activity</p>
          {recentHistory.length === 0 ? (
            <div className="py-16 text-center empty-state-pattern rounded-2xl border border-white/[0.03]">
              <div className="relative z-10">
                <div className="mx-auto mb-4 w-11 h-11 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-700">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <p className="text-zinc-500 text-sm font-medium">Nothing here yet</p>
                <p className="text-zinc-700 text-xs mt-1">Your transactions will show up here</p>
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

        {/* ── Footer ── */}
        <div className="mt-16 pt-6 border-t border-white/[0.03] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded bg-gradient-to-b from-[#00e5a0]/20 to-[#00e5a0]/5 flex items-center justify-center">
              <span className="text-[6px] font-black text-[#00e5a0]/60">QV</span>
            </div>
            <p className="text-[11px] text-zinc-800 font-mono">Quantum Vault v0.1</p>
          </div>
          <button
            onClick={resetWallet}
            className="text-[11px] text-zinc-700 hover:text-red-400/80 transition-colors"
          >
            Reset wallet
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

/* ── Reusable Action Button ── */
function ActionButton({ label, sublabel, icon, onClick }: {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="action-btn rounded-xl py-4 flex flex-col items-center gap-1.5 text-zinc-400 hover:text-white group"
    >
      <div className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.04] flex items-center justify-center mb-0.5 group-hover:bg-white/[0.06] group-hover:border-white/[0.08] transition-all">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 group-hover:text-white transition-colors">
          {icon}
        </svg>
      </div>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-[10px] text-zinc-700 group-hover:text-zinc-500 transition-colors">{sublabel}</span>
    </motion.button>
  );
}

/* ── Transaction Row ── */
function TxRow({ tx, explorerBase }: { tx: TxHistoryEntry; explorerBase: string }) {
  const isSend = tx.type === "send";
  const amount = tx.amount / LAMPORTS_PER_SOL;
  const label = TX_LABELS[tx.type] || tx.type;

  return (
    <a
      href={tx.signature ? `${explorerBase}/tx/${tx.signature}` : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/[0.02] transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
          isSend
            ? "bg-white/[0.04] text-zinc-500 group-hover:bg-white/[0.06]"
            : "bg-[#00e5a0]/[0.08] text-[#00e5a0] group-hover:bg-[#00e5a0]/[0.12]"
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
          <p className="text-sm text-zinc-300 group-hover:text-white transition-colors">{label}</p>
          <p className="text-[11px] text-zinc-700 font-mono">{new Date(tx.timestamp).toLocaleDateString()}</p>
        </div>
      </div>
      <span className={`text-sm tabular-nums font-mono ${isSend ? "text-zinc-500" : "text-[#00e5a0]"}`}>
        {isSend ? "-" : "+"}{amount.toFixed(4)}
      </span>
    </a>
  );
}

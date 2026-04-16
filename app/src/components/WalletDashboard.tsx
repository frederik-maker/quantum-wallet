"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWalletStore, TxHistoryEntry } from "@/lib/wallet-store";
import { QuantumShield } from "./QuantumShield";
import { SendModal } from "./SendModal";
import { ReceiveModal } from "./ReceiveModal";
import { MigrateModal } from "./MigrateModal";
import { PrivacyPanel } from "./PrivacyPanel";
import { LAMPORTS_PER_SOL } from "@/lib/constants";
import { Keypair } from "@solana/web3.js";

type Tab = "overview" | "privacy" | "activity";

const TX_LABELS: Record<string, string> = {
  open: "Vault created",
  send: "Sent",
  receive: "Received",
  fund: "Funded vault",
  close: "Vault closed",
  split: "Keys rotated",
  migrate: "Migrated",
  umbra_register: "Umbra activated",
  magicblock_connect: "MagicBlock connected",
};

interface WalletDashboardProps {
  onViewHome?: () => void;
}

export function WalletDashboard({ onViewHome }: WalletDashboardProps) {
  const {
    walletName, totalBalance, feePayerBalance, vaults, history, network, rpcUrl,
    loading, error, refreshBalances, setNetwork, resetWallet, fundVault,
  } = useWalletStore();

  const [modal, setModal] = useState<"send" | "receive" | "migrate" | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [tabLine, setTabLine] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ overview: null, privacy: null, activity: null });
  const [settings, setSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [funding, setFunding] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);
  const [airdropping, setAirdropping] = useState(false);
  const [airdropMsg, setAirdropMsg] = useState<string | null>(null);

  const _hasHydrated = useWalletStore((s) => s._hasHydrated);
  const active = vaults.filter((v) => v.status === "active");
  const spent = vaults.filter((v) => v.status === "spent");
  const sol = totalBalance / LAMPORTS_PER_SOL;
  const hasAnyVault = vaults.length > 0;
  const isSetUp = active.length > 0 || hasAnyVault;

  const feePayerSecret = useWalletStore((s) => s.feePayerSecret);
  const feePayerAddr = feePayerSecret
    ? (() => { try { return Keypair.fromSecretKey(Uint8Array.from(feePayerSecret)).publicKey.toBase58(); } catch { return null; } })()
    : null;
  const addr = active[0]?.address || feePayerAddr;

  useEffect(() => {
    refreshBalances();
    const ms = network === "mainnet-beta" ? 60000 : 15000;
    const iv = setInterval(refreshBalances, ms);
    return () => clearInterval(iv);
  }, [refreshBalances]);

  useEffect(() => {
    const el = tabRefs.current[tab];
    if (el) {
      const parent = el.parentElement;
      if (parent) {
        setTabLine({ left: el.offsetLeft, width: el.offsetWidth });
      }
    }
  }, [tab]);

  const copyAddr = useCallback(() => {
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [addr]);

  const explorer = "https://explorer.solana.com";
  const clusterParam = network === "mainnet-beta" ? "" : `?cluster=${network}`;

  const recent = history.slice().reverse().slice(0, 20);

  return (
    <div className="min-h-screen relative">
      {/* Single ambient blob — lightweight */}
      <div className="mesh-bg">
        <div className="w-[600px] h-[400px] -top-[200px] left-[10%] bg-[#00e5a0]/[0.025]" />
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#09090f]/80 header-glass">
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onViewHome && (
              <>
                <button onClick={onViewHome} className="text-[11px] font-mono text-[#00e5a0]/40 hover:text-[#00e5a0]/70 transition-colors tracking-[0.15em] uppercase">QV</button>
                <div className="w-px h-3.5 bg-white/[0.06]" />
              </>
            )}
            <span className="text-[13px] font-medium text-zinc-400">{walletName}</span>
            <QuantumShield status={loading ? "rotating" : !_hasHydrated ? "rotating" : isSetUp ? "protected" : "vulnerable"} />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
              <div className={`w-1.5 h-1.5 rounded-full ${network === "mainnet-beta" ? "bg-[#00e5a0]" : "bg-amber-400"}`} />
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value as "devnet" | "mainnet-beta")}
                className="bg-transparent focus:outline-none cursor-pointer hover:text-zinc-400 transition"
              >
                <option value="devnet">devnet</option>
                <option value="mainnet-beta">mainnet</option>
              </select>
            </div>
            <button onClick={() => setSettings(true)} className="text-zinc-500 hover:text-zinc-400 transition-colors p-1">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Settings ── */}
      <AnimatePresence>
        {settings && <SettingsModal walletName={walletName} network={network} feePayerSecret={feePayerSecret} feePayerAddr={feePayerAddr} vaults={vaults} keyCopied={keyCopied} setKeyCopied={setKeyCopied} resetWallet={resetWallet} onClose={() => setSettings(false)} />}
      </AnimatePresence>

      {/* ── Main ── */}
      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="relative z-10 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-6 pt-8 pb-16">

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mb-8 text-[13px] text-red-400/80 bg-red-500/[0.04] border border-red-500/[0.08] rounded-xl px-4 py-3"
            >
              {error.includes("debit") || error.includes("Simulation") ? "No SOL for fees. Fund your wallet first." : error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Balance ── */}
        <div className="relative pt-8 pb-4 mb-2">
          {/* Subtle ambient glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[350px] h-[180px] rounded-full bg-[#00e5a0]/[0.03] blur-[80px]" />
          </div>

          <div className="relative text-center">
            <div>
              <span className="balance-number text-[76px] sm:text-[88px] font-extralight">
                {sol.toFixed(4)}
              </span>
              <span className="text-lg text-zinc-500/80 font-light ml-2 align-baseline">SOL</span>
            </div>

            {/* Address pill */}
            {addr && (
              <motion.button
                onClick={copyAddr}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-5 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] hover:border-[#00e5a0]/20 hover:bg-[#00e5a0]/[0.02] transition-all duration-300 group"
              >
                <code className="text-[11px] text-zinc-500 font-mono group-hover:text-zinc-300 transition-colors">
                  {addr.slice(0, 6)}...{addr.slice(-4)}
                </code>
                <span className="text-zinc-600 group-hover:text-[#00e5a0] transition-colors">
                  {copied ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                  )}
                </span>
              </motion.button>
            )}

            {/* Status subtitle */}
            {isSetUp && spent.length > 0 && (
              <p className="mt-4 text-[10px] text-[#00e5a0]/40 font-mono tracking-wide">
                {spent.length} key rotation{spent.length !== 1 ? "s" : ""} completed
              </p>
            )}
            {_hasHydrated && !isSetUp && addr && (
              <p className="mt-4 text-[11px] text-zinc-500">
                {feePayerBalance > 0
                  ? `${(feePayerBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL available — create a vault to protect it`
                  : "Fund this address to get started"}
              </p>
            )}
            {isSetUp && active.length > 0 && spent.length === 0 && (
              <p className="mt-4 text-[10px] text-[#00e5a0]/40 font-mono tracking-wide">
                {active.length} vault{active.length !== 1 ? "s" : ""} · quantum-safe
              </p>
            )}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex justify-center gap-2.5 py-6 mb-4">
          <motion.button
            onClick={() => setModal("send")}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="action-pill group"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-400 group-hover:text-white transition-colors"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            <span className="text-[13px] text-zinc-400 group-hover:text-white transition-colors">Send</span>
          </motion.button>
          <motion.button
            onClick={() => setModal("receive")}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="action-pill action-pill-cyan group"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#0ea5e9] transition-colors"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
            <span className="text-[13px] text-[#0ea5e9]/80 group-hover:text-[#0ea5e9] transition-colors">Receive</span>
          </motion.button>
          <motion.button
            onClick={() => setModal("migrate")}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className={`action-pill group ${!isSetUp ? "action-pill-accent" : ""}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`${!isSetUp ? "text-[#00e5a0]" : "text-zinc-400 group-hover:text-white"} transition-colors`}><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" /></svg>
            <span className={`text-[13px] ${!isSetUp ? "text-[#00e5a0]/80 group-hover:text-[#00e5a0]" : "text-zinc-400 group-hover:text-white"} transition-colors`}>Migrate</span>
          </motion.button>
        </div>

        {/* ── Tabs ── */}
        <div className="relative flex gap-8 border-b border-white/[0.04] mb-8">
          {(["overview", "privacy", "activity"] as Tab[]).map((t) => (
            <button
              key={t}
              ref={(el) => { tabRefs.current[t] = el; }}
              onClick={() => setTab(t)}
              className={`pb-3 text-[13px] capitalize transition-colors duration-200 ${tab === t ? "text-white" : "text-zinc-500 hover:text-zinc-400"}`}
            >
              {t}
              {t === "activity" && recent.length > 0 && (
                <span className="ml-1.5 text-[10px] text-zinc-500 font-mono">{recent.length}</span>
              )}
            </button>
          ))}
          {/* Underline — measured from refs */}
          <motion.div
            className="tab-line"
            animate={{ left: tabLine.left, width: tabLine.width }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          />
        </div>

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">
          {tab === "overview" && (
            <motion.div key="o" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              {/* Vault setup — only show after store hydrates from localStorage */}
              {_hasHydrated && !isSetUp && (
                <div className="card-setup card-shine p-6 mb-6">
                  {/* Visual header with icon */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-[#00e5a0]/[0.06] border border-[#00e5a0]/[0.08] flex items-center justify-center shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="1.5"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" /><path d="M12 22V12" opacity="0.4" /><path d="M3 7l9 5 9-5" opacity="0.4" /></svg>
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>Set up your vault</p>
                      <p className="text-[12px] text-zinc-500 mt-0.5">Quantum-safe key rotation for every transaction</p>
                    </div>
                  </div>

                  {/* Compact explanation */}
                  <p className="text-[12px] text-zinc-500 leading-relaxed mb-4">
                    Standard wallets reuse keys forever — vulnerable to quantum attacks. A vault uses <span className="text-zinc-300">one-time keys</span> that are destroyed and replaced after every send, so there&apos;s nothing to crack.
                  </p>

                  {/* Visual step indicators */}
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {[
                      { n: "1", label: "Generate", desc: "W-OTS keypair" },
                      { n: "2", label: "Lock", desc: "On-chain vault" },
                      { n: "3", label: "Protect", desc: "Auto-rotate keys" },
                    ].map((s) => (
                      <div key={s.n} className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 text-center">
                        <span className="text-[10px] font-mono text-[#00e5a0]/50">{s.n}</span>
                        <p className="text-[11px] text-zinc-300 font-medium mt-1">{s.label}</p>
                        <p className="text-[9px] text-zinc-600 mt-0.5">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                  {network === "devnet" && feePayerAddr && (
                    <div className="space-y-2 mb-5">
                      {/* In-app airdrop button */}
                      <motion.button
                        onClick={async () => {
                          setAirdropping(true); setAirdropMsg(null);
                          try {
                            const { Connection, PublicKey, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
                            const conn = new Connection(rpcUrl, "confirmed");
                            const pubkey = new PublicKey(feePayerAddr);
                            const balBefore = await conn.getBalance(pubkey);
                            const sig = await conn.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL);
                            await conn.confirmTransaction(sig, "confirmed");
                            // Verify balance actually increased
                            const balAfter = await conn.getBalance(pubkey);
                            if (balAfter > balBefore) {
                              setAirdropMsg(`${((balAfter - balBefore) / LAMPORTS_PER_SOL).toFixed(2)} SOL received!`);
                            } else {
                              setAirdropMsg("Transaction confirmed but balance unchanged — try a faucet link below.");
                            }
                            refreshBalances();
                          } catch (err) {
                            const msg = err instanceof Error ? err.message : "Airdrop failed";
                            if (msg.includes("429") || msg.includes("limit") || msg.includes("Internal error") || msg.includes("Too Many")) {
                              setAirdropMsg("Devnet faucet is busy — use a link below instead.");
                            } else {
                              setAirdropMsg("Airdrop failed — try a faucet link below.");
                            }
                          } finally { setAirdropping(false); }
                        }}
                        disabled={airdropping}
                        whileHover={!airdropping ? { scale: 1.01 } : {}}
                        whileTap={!airdropping ? { scale: 0.98 } : {}}
                        className="w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[13px] font-medium text-zinc-300 hover:bg-white/[0.06] hover:border-white/[0.08] transition-all disabled:opacity-40"
                      >
                        {airdropping
                          ? <span className="inline-flex items-center gap-2"><span className="w-3 h-3 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" /> Requesting...</span>
                          : "Airdrop 1 SOL"}
                      </motion.button>
                      {airdropMsg && (
                        <p className={`text-[11px] ${airdropMsg.includes("received") ? "text-[#00e5a0]/70" : "text-red-400/60"}`}>{airdropMsg}</p>
                      )}

                      {/* Faucet links */}
                      <div className="flex items-center gap-2">
                        <a href={`https://faucet.solana.com/?recipient=${feePayerAddr}`} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.07] transition-all text-[11px] text-zinc-500 hover:text-zinc-300"
                        >
                          Solana Faucet <span className="text-zinc-600">&rarr;</span>
                        </a>
                        <a href={`https://faucet.quicknode.com/solana/devnet`} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.07] transition-all text-[11px] text-zinc-500 hover:text-zinc-300"
                        >
                          QuickNode <span className="text-zinc-600">&rarr;</span>
                        </a>
                      </div>
                      {/* CLI fallback */}
                      <button
                        onClick={() => { navigator.clipboard.writeText(`solana airdrop 2 ${feePayerAddr} --url devnet`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        className="w-full text-left px-3 py-2 rounded-xl bg-white/[0.015] border border-white/[0.03] hover:bg-white/[0.03] transition-all group"
                      >
                        <code className="text-[10px] text-zinc-600 font-mono break-all leading-relaxed group-hover:text-zinc-400 transition-colors">
                          solana airdrop 2 {feePayerAddr} --url devnet
                        </code>
                        <span className="block text-[10px] text-zinc-600 mt-0.5">{copied ? "copied ✓" : "copy CLI command"}</span>
                      </button>
                    </div>
                  )}
                  {fundError && (
                    <p className="text-[12px] text-red-400/80 bg-red-500/[0.04] border border-red-500/[0.08] rounded-xl px-4 py-2.5 mb-3">
                      {fundError}
                    </p>
                  )}
                  <motion.button
                    onClick={async () => {
                      setFunding(true); setFundError(null);
                      try { await fundVault(); } catch {
                        // fundVault sets state.error but we also show it locally
                        const storeErr = useWalletStore.getState().error;
                        setFundError(storeErr || "Failed to create vault. Make sure you have SOL for fees.");
                      }
                      setFunding(false);
                    }}
                    disabled={funding}
                    whileHover={!funding ? { scale: 1.01 } : {}}
                    whileTap={!funding ? { scale: 0.98 } : {}}
                    className="btn-glow w-full py-3 rounded-xl bg-[#00e5a0] text-black text-sm font-semibold disabled:opacity-30"
                  >
                    {funding ? <span className="inline-flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Creating...</span> : "Create vault"}
                  </motion.button>
                </div>
              )}

              {/* How it works */}
              <div className="card-highlight card-shine p-5 mb-4">
                <p className="text-[13px] font-semibold text-zinc-200 mb-4" style={{ letterSpacing: "-0.01em" }}>How it works</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2" strokeLinecap="round"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" /></svg>, label: "Migrate", desc: "Import from Phantom, Solflare, or any wallet", color: "text-[#00e5a0]", bg: "bg-[#00e5a0]/[0.05]" },
                    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>, label: "Send", desc: "Keys auto-rotate after every transfer", color: "text-zinc-400", bg: "bg-white/[0.03]" },
                    { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>, label: "Receive", desc: "Address changes after each send", color: "text-[#0ea5e9]", bg: "bg-[#0ea5e9]/[0.04]" },
                  ].map((f) => (
                    <div key={f.label} className="rounded-xl bg-white/[0.015] border border-white/[0.04] p-3.5 hover:bg-white/[0.025] hover:border-white/[0.07] transition-all duration-200">
                      <div className={`w-7 h-7 rounded-lg ${f.bg} flex items-center justify-center mb-2.5`}>
                        <span className={f.color}>{f.icon}</span>
                      </div>
                      <p className={`text-[12px] font-medium ${f.color} mb-0.5`}>{f.label}</p>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vault addresses */}
              {isSetUp && <VaultList vaults={active} explorer={explorer} clusterParam={clusterParam} />}
            </motion.div>
          )}

          {tab === "privacy" && (
            <motion.div key="p" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <PrivacyPanel />
            </motion.div>
          )}

          {tab === "activity" && (
            <motion.div key="a" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <Activity history={recent} explorer={explorer} clusterParam={clusterParam} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-white/[0.03] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#00e5a0]/[0.06] flex items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2.5"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" /></svg>
            </div>
            <p className="text-[10px] text-zinc-600 font-mono">Quantum Vault</p>
          </div>
          <a href="https://github.com/frederik-maker/quantum-wallet" target="_blank" rel="noopener noreferrer" className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors font-mono">GitHub &rarr;</a>
        </div>
      </motion.main>

      {/* Modals */}
      <AnimatePresence>
        {modal === "send" && <SendModal onClose={() => setModal(null)} />}
        {modal === "receive" && <ReceiveModal onClose={() => setModal(null)} />}
        {modal === "migrate" && <MigrateModal onClose={() => setModal(null)} />}
      </AnimatePresence>
    </div>
  );
}

/* ActionBtn removed — replaced with inline action-pill buttons */

/* ─ Vault list ─ */
function VaultList({ vaults, explorer, clusterParam }: { vaults: { id: string; address: string; balance: number }[]; explorer: string; clusterParam: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-subtle p-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between group">
        <span className="text-[11px] text-zinc-500 font-mono group-hover:text-zinc-400 transition-colors">
          {vaults.length} vault{vaults.length !== 1 ? "s" : ""}
        </span>
        <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500"><path d="M6 9l6 6 6-6" /></motion.svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="pt-3 space-y-1">
              {vaults.map((v) => (
                <a key={v.id} href={`${explorer}/address/${v.address}${clusterParam}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-white/[0.02] transition-colors group"
                >
                  <code className="text-[10px] text-zinc-500 font-mono group-hover:text-zinc-400 transition-colors truncate max-w-[200px]">{v.address.slice(0, 10)}...{v.address.slice(-6)}</code>
                  <span className="text-[10px] text-zinc-500 font-mono tabular-nums">{(v.balance / LAMPORTS_PER_SOL).toFixed(4)}</span>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─ Activity ─ */
function Activity({ history, explorer, clusterParam }: { history: TxHistoryEntry[]; explorer: string; clusterParam: string }) {
  if (history.length === 0) {
    return (
      <div className="empty-state rounded-2xl border border-white/[0.04] py-16 text-center relative overflow-hidden">
        <div className="relative z-10">
          {/* Animated rings */}
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border border-white/[0.04] animate-ping" style={{ animationDuration: "3s" }} />
            <div className="absolute inset-2 rounded-full border border-white/[0.03]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              </div>
            </div>
          </div>
          <p className="text-[14px] text-zinc-400 font-medium mb-1.5">No activity yet</p>
          <p className="text-[12px] text-zinc-600 max-w-[240px] mx-auto leading-relaxed">
            Transactions will appear here after your first vault creation or transfer.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-white/[0.015] border border-white/[0.04] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.04]">
        <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-[0.15em]">{history.length} transaction{history.length !== 1 ? "s" : ""}</p>
      </div>
      <div className="px-4">
        {history.map((tx, i) => (
          <motion.div key={tx.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03, duration: 0.3 }}>
            <TxRow tx={tx} explorer={explorer} clusterParam={clusterParam} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─ Transaction type icons ─ */
const TX_ICONS: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  send: {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>,
    bg: "bg-red-400/[0.08]", color: "text-red-400",
  },
  receive: {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>,
    bg: "bg-[#00e5a0]/[0.08]", color: "text-[#00e5a0]",
  },
  fund: {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>,
    bg: "bg-[#00e5a0]/[0.08]", color: "text-[#00e5a0]",
  },
  open: {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" /></svg>,
    bg: "bg-violet-500/[0.08]", color: "text-violet-400",
  },
  close: {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>,
    bg: "bg-zinc-500/[0.08]", color: "text-zinc-400",
  },
  split: {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 010-7.778zm0 0L12 12" /><path d="M14 4l6 6" /></svg>,
    bg: "bg-cyan-500/[0.08]", color: "text-cyan-400",
  },
  migrate: {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>,
    bg: "bg-[#00e5a0]/[0.08]", color: "text-[#00e5a0]",
  },
  umbra_register: {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
    bg: "bg-violet-500/[0.08]", color: "text-violet-400",
  },
  magicblock_connect: {
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
    bg: "bg-cyan-500/[0.08]", color: "text-cyan-400",
  },
};

/* ─ Transaction row ─ */
function TxRow({ tx, explorer, clusterParam }: { tx: TxHistoryEntry; explorer: string; clusterParam: string }) {
  const amt = tx.amount / LAMPORTS_PER_SOL;
  const isSend = tx.type === "send";
  const url = tx.signature ? `${explorer}/tx/${tx.signature}${clusterParam}` : undefined;
  const { icon, bg, color } = TX_ICONS[tx.type] || TX_ICONS.open;
  const date = new Date(tx.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = new Date(tx.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  const content = (
    <div className="activity-row group/tx">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0 transition-all duration-200 group-hover/tx:scale-105`}>
        <span className={color}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-zinc-300 font-medium">{TX_LABELS[tx.type] || tx.type}</p>
        <p className="text-[10px] text-zinc-600 font-mono">{date} · {time}</p>
      </div>
      {amt > 0 ? (
        <div className="text-right">
          <span className={`text-[13px] tabular-nums font-mono font-medium ${isSend ? "text-zinc-400" : "text-[#00e5a0]"}`}>
            {isSend ? "-" : "+"}{amt.toFixed(4)}
          </span>
          <p className="text-[10px] text-zinc-600 font-mono">SOL</p>
        </div>
      ) : (
        <span className="text-[10px] text-zinc-500 font-mono px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04]">{tx.status}</span>
      )}
    </div>
  );

  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      {content}
      {url && <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent mx-9" />}
    </a>
  ) : (
    <>
      {content}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.03] to-transparent mx-9" />
    </>
  );
}

/* ─ Settings modal ─ */
function SettingsModal({ walletName, network, feePayerSecret, feePayerAddr, vaults, keyCopied, setKeyCopied, resetWallet, onClose }: {
  walletName: string; network: string; feePayerSecret: number[] | null; feePayerAddr: string | null;
  vaults: import("@/lib/wallet-store").VaultEntry[];
  keyCopied: boolean; setKeyCopied: (v: boolean) => void; resetWallet: () => void; onClose: () => void;
}) {
  const [vaultCopied, setVaultCopied] = useState(false);
  const activeVaults = vaults.filter((v) => v.status === "active");

  const exportFullBackup = () => {
    const backup = {
      _format: "quantum-vault-backup-v1",
      _warning: "Contains private keys. Never share. Store offline.",
      feePayer: {
        _note: "Standard Ed25519 keypair — required by Solana to sign transactions and pay fees. NOT quantum-safe.",
        type: "ed25519",
        secretKey: feePayerSecret ? Array.from(feePayerSecret) : null,
        sizeBytes: 64,
      },
      vaults: vaults.length > 0
        ? vaults.map((v) => ({
            _note: "Winternitz one-time signature keypair — quantum-safe. 32 hash chains (~3KB). This is what protects your funds.",
            type: "w-ots",
            id: v.id,
            keypairJson: v.keypairJson,
            address: v.address,
            bump: v.bump,
            status: v.status,
            createdAt: v.createdAt,
          }))
        : { _note: "No vaults created yet. Create a vault to generate your first W-OTS quantum-safe keypair." },
      walletName,
      network,
      exportedAt: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(backup, null, 2));
    setVaultCopied(true);
    setTimeout(() => setVaultCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ y: 16, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 8, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }} className="relative w-full max-w-md md:max-w-lg modal-glass p-6 max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>Settings</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-all text-xl">&times;</button>
        </div>

        <div className="space-y-6">
          {/* Wallet identity */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#00e5a0]/[0.06] border border-[#00e5a0]/[0.08] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="1.5"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" /></svg>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-white">{walletName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${network === "mainnet-beta" ? "bg-[#00e5a0]" : "bg-amber-400"}`} />
                  <p className="text-[11px] text-zinc-500 font-mono">{network}{feePayerAddr && ` · ${feePayerAddr.slice(0,6)}...${feePayerAddr.slice(-4)}`}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Backup export */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-3">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              <p className="text-[12px] text-zinc-400 font-medium">Export backup</p>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">
              Your wallet has two key types: <span className="text-zinc-400">Ed25519 fee payer</span> (signs txs) and <span className="text-zinc-400">W-OTS vault keys</span> (quantum-safe). You need both to restore.
            </p>
            {vaults.length === 0 && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-500/[0.04] border border-amber-500/[0.08] px-3 py-2.5 mb-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400/70 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                <p className="text-[11px] text-amber-400/70">No vaults yet — backup will only contain the Ed25519 fee payer.</p>
              </div>
            )}
            <motion.button onClick={exportFullBackup} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="btn-glass w-full py-3 rounded-xl text-[13px] text-zinc-300 font-medium"
            >
              {vaultCopied ? (
                <span className="inline-flex items-center gap-2 text-[#00e5a0]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                  Copied to clipboard
                </span>
              ) : "Copy full backup"}
            </motion.button>
            <p className="text-[10px] text-red-400/40 mt-2 flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              Never share this with anyone. Store offline.
            </p>
          </motion.div>

          {/* Key info */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-6" />
            <div className="flex items-center gap-2 mb-3">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 010-7.778zm0 0L12 12" /></svg>
              <p className="text-[12px] text-zinc-400 font-medium">Your keys</p>
            </div>
            <div className="space-y-2">
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3.5 hover:bg-white/[0.03] hover:border-white/[0.07] transition-all duration-200">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] text-zinc-300 font-medium">Fee payer</p>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-600 px-1.5 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04]">Ed25519 · 64B</span>
                </div>
                {feePayerAddr && (
                  <p className="text-[10px] text-zinc-600 font-mono break-all pl-[34px]">{feePayerAddr}</p>
                )}
              </div>
              <div className="rounded-xl bg-[#00e5a0]/[0.015] border border-[#00e5a0]/[0.06] p-3.5 hover:bg-[#00e5a0]/[0.025] hover:border-[#00e5a0]/[0.1] transition-all duration-200">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-[#00e5a0]/[0.08] flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" /></svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] text-zinc-300 font-medium">Vault keys</p>
                  </div>
                  <span className="text-[9px] font-mono text-[#00e5a0]/50 px-1.5 py-0.5 rounded-md bg-[#00e5a0]/[0.04] border border-[#00e5a0]/[0.06]">W-OTS · ~3KB</span>
                </div>
                <p className="text-[10px] text-zinc-500 pl-[34px]">
                  {activeVaults.length === 0
                    ? "No active vaults yet"
                    : `${activeVaults.length} active vault${activeVaults.length > 1 ? "s" : ""} · keys rotate after each send`}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Danger zone */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-6" />
            <div className="flex items-center gap-2 mb-3">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400/50"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" /></svg>
              <p className="text-[12px] text-red-400/60 font-medium">Danger zone</p>
            </div>
            <button onClick={() => { if (confirm("Delete wallet permanently? Export backup first.")) resetWallet(); }}
              className="w-full py-3 rounded-xl border border-red-500/10 bg-red-500/[0.02] text-[13px] text-red-400/70 hover:bg-red-500/[0.06] hover:border-red-500/[0.18] hover:text-red-400 transition-all duration-200"
            >
              Delete wallet permanently
            </button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

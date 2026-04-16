"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useWalletStore } from "@/lib/wallet-store";

interface CreateWalletProps {
  hasWallet?: boolean;
  onBackToWallet?: () => void;
}

export function CreateWallet({ hasWallet, onBackToWallet }: CreateWalletProps) {
  const [name, setName] = useState("");
  const [step, setStep] = useState<"hero" | "create">("hero");
  const initializeWallet = useWalletStore((s) => s.initializeWallet);
  const loading = useWalletStore((s) => s.loading);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await initializeWallet(name.trim());
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient mesh */}
      <div className="mesh-bg">
        <div className="w-[600px] h-[400px] -top-[150px] left-[10%] bg-[#00e5a0]/[0.025]" />
      </div>

      {step === "hero" ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="relative z-10 max-w-xl w-full">
          {/* Logo */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }} className="flex items-center gap-2.5 mb-10">
            <div className="w-7 h-7 rounded-lg bg-[#00e5a0]/[0.06] border border-[#00e5a0]/[0.08] flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" /></svg>
            </div>
            <span className="text-[11px] font-mono text-[#00e5a0]/40 tracking-[0.2em] uppercase">Quantum Vault</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}
            className="text-[clamp(2.5rem,7vw,4.5rem)] font-bold text-white leading-[1.05] mb-6" style={{ letterSpacing: "-0.035em" }}
          >
            Keys that expire<br />
            <span className="hero-gradient-text">before they&apos;re cracked.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7 }}
            className="text-base text-zinc-500 leading-relaxed mb-12 max-w-md"
          >
            A Solana wallet that rotates to fresh quantum-resistant keys after every transaction. Nothing reused. Nothing exposed.
          </motion.p>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }} className="flex items-center gap-5 mb-20">
            {hasWallet && onBackToWallet ? (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onBackToWallet}
                className="btn-glow px-8 py-3.5 rounded-full bg-[#00e5a0] text-black font-semibold text-[15px]"
              >Back to wallet</motion.button>
            ) : (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep("create")}
                className="btn-glow px-8 py-3.5 rounded-full bg-[#00e5a0] text-black font-semibold text-[15px]"
              >Create wallet</motion.button>
            )}
            <a href="https://github.com/frederik-maker/quantum-wallet" target="_blank" rel="noopener noreferrer" className="text-[13px] text-zinc-500 hover:text-zinc-400 transition-colors">
              Source &rarr;
            </a>
          </motion.div>

          {/* Features — 3 col */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65, duration: 0.8 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14">
            {[
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="1.5"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" /><path d="M12 22V12" opacity="0.4" /><path d="M3 7l9 5 9-5" opacity="0.4" /></svg>, color: "bg-[#00e5a0]/[0.06]", border: "border-[#00e5a0]/[0.08]", topGlow: "from-[#00e5a0]/20", title: "Quantum-safe", desc: "W-OTS hash-based signatures. Keys rotate after every use." },
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>, color: "bg-violet-500/[0.06]", border: "border-violet-500/[0.08]", topGlow: "from-violet-500/20", title: "Private", desc: "Umbra shielded transfers hide sender and amount." },
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>, color: "bg-cyan-500/[0.06]", border: "border-cyan-500/[0.08]", topGlow: "from-cyan-500/20", title: "Fast", desc: "MagicBlock ephemeral rollups for sub-50ms key rotation." },
            ].map((f) => (
              <div key={f.title} className="feature-card-hover p-5 relative overflow-hidden">
                {/* Top colored glow line */}
                <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-20`} style={{ color: f.topGlow.includes("00e5a0") ? "#00e5a0" : f.topGlow.includes("violet") ? "#8b5cf6" : "#0ea5e9" }} />
                <div className={`w-9 h-9 rounded-xl ${f.color} ${f.border} border flex items-center justify-center mb-3.5`}>{f.icon}</div>
                <p className="text-[13px] font-semibold text-white mb-1.5">{f.title}</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </motion.div>

          {/* How it works */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.8 }} className="max-w-lg">
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-8" />
            <p className="text-[10px] font-mono text-[#00e5a0]/30 uppercase tracking-[0.25em] mb-5">How it works</p>
            <div className="space-y-4 text-[13px] text-zinc-500 leading-relaxed">
              <p><span className="text-zinc-300 font-medium">Winternitz One-Time Signatures (W-OTS)</span> — hash-based signatures secure against quantum computers. Unlike Ed25519, breaking it requires breaking the hash function itself.</p>
              <p>Each vault holds SOL behind a unique W-OTS keypair. When you send, the program verifies the signature, moves funds to a fresh vault, and the old key is permanently spent. <span className="text-zinc-400">Nothing reused. Nothing exposed.</span></p>
            </div>
            <div className="flex items-center gap-5 mt-6 text-[10px] font-mono text-zinc-600">
              <a href="https://github.com/frederik-maker/quantum-wallet" target="_blank" rel="noopener noreferrer" className="hover:text-[#00e5a0]/60 transition-colors duration-300">Source code &rarr;</a>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="relative z-10 max-w-md w-full">
          <motion.button initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} onClick={() => setStep("hero")}
            className="text-[13px] text-zinc-500 hover:text-zinc-400 mb-14 transition-colors flex items-center gap-1.5 group"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">&larr;</span> Back
          </motion.button>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="w-12 h-12 rounded-2xl bg-[#00e5a0]/[0.06] border border-[#00e5a0]/[0.08] flex items-center justify-center mb-6">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="1.5"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" /></svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2" style={{ letterSpacing: "-0.025em" }}>Name your wallet</h2>
            <p className="text-zinc-500 mb-10 text-[13px]">Everything stays on your device. No accounts, no servers.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-8">
            <div className="relative">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Wallet" autoFocus
                className="w-full bg-transparent border-b border-zinc-700/50 px-0 py-4 text-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00e5a0]/30 transition-all duration-300"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              {name.trim() && (
                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#00e5a0]/40 via-[#00e5a0]/60 to-[#0ea5e9]/40 origin-left" />
              )}
            </div>
            <motion.button onClick={handleCreate} disabled={!name.trim() || loading}
              whileHover={name.trim() && !loading ? { scale: 1.01 } : {}} whileTap={name.trim() && !loading ? { scale: 0.98 } : {}}
              className="btn-glow w-full py-4 rounded-full bg-[#00e5a0] text-black font-semibold text-base disabled:opacity-15 transition-opacity duration-300"
            >
              {loading ? <span className="inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Setting up...</span> : "Create wallet"}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

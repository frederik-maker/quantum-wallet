"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useWalletStore } from "@/lib/wallet-store";

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export function CreateWallet() {
  const [name, setName] = useState("");
  const [step, setStep] = useState<"hero" | "create">("hero");
  const initializeWallet = useWalletStore((s) => s.initializeWallet);
  const loading = useWalletStore((s) => s.loading);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await initializeWallet(name.trim());
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative noise dot-grid">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-[#00e5a0]/[0.05] blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-[#0ea5e9]/[0.04] blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#8b5cf6]/[0.03] blur-[140px]" />
      </div>

      {step === "hero" ? (
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="relative z-10 max-w-2xl w-full text-center"
        >
          {/* Logo mark */}
          <motion.div variants={fadeUp} className="mb-8">
            <div className="inline-flex relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-[#00e5a0]/25 to-[#00e5a0]/8 border border-[#00e5a0]/30 flex items-center justify-center pulse-ring shadow-[0_4px_24px_rgba(0,229,160,0.2),0_0_60px_rgba(0,229,160,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-7xl font-bold mb-5"
            style={{ letterSpacing: "-0.03em" }}
          >
            <span className="shimmer">Quantum Vault</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg sm:text-xl text-zinc-400 max-w-lg mx-auto mb-14 leading-relaxed"
          >
            The Solana wallet built to survive quantum computers.
            Your keys rotate after every transaction &mdash; nothing is ever exposed.
          </motion.p>

          {/* Value props - human language */}
          <motion.div
            variants={fadeUp}
            className="flex items-stretch justify-center gap-4 sm:gap-6 mb-14 max-w-lg mx-auto"
          >
            {[
              { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", title: "Quantum-proof", desc: "Keys that can't be cracked, even by future computers" },
              { icon: "M4 4v16h16M4 14l4-4 4 4 8-8", title: "Auto-rotating", desc: "Fresh keys after every send, nothing reused" },
              { icon: "M12 2L3 7v10l9 5 9-5V7l-9-5z", title: "On-chain", desc: "Built natively on Solana, not a wrapper" },
            ].map((prop) => (
              <motion.div
                key={prop.title}
                className="flex-1 text-left p-4 rounded-xl border border-white/[0.10] bg-white/[0.04]"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)" }}
                variants={{
                  initial: { opacity: 0, y: 16 },
                  animate: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
                  },
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="1.5" className="mb-3 opacity-90">
                  <path d={prop.icon} />
                </svg>
                <div className="text-sm font-medium text-zinc-200 mb-1">{prop.title}</div>
                <div className="text-[11px] text-zinc-500 leading-snug">{prop.desc}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div variants={fadeUp}>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => setStep("create")}
              className="btn-primary group relative px-14 py-5 rounded-full bg-[#00e5a0] text-black font-bold text-lg shadow-[0_0_30px_rgba(0,229,160,0.3),0_0_60px_rgba(0,229,160,0.1)]"
            >
              Create your wallet
              <span className="inline-block ml-2 transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
            </motion.button>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="text-[11px] text-zinc-700 mt-8 tracking-wide"
          >
            100% local. No servers, no tracking, no accounts.
          </motion.p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative z-10 max-w-md w-full"
        >
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setStep("hero")}
            className="text-sm text-zinc-600 hover:text-zinc-400 mb-8 transition-colors flex items-center gap-1.5 group"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">&larr;</span>
            <span>Back</span>
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 30 }}
          >
            <h2 className="text-3xl font-bold text-white mb-2" style={{ letterSpacing: "-0.02em" }}>
              Name your wallet
            </h2>
            <p className="text-zinc-500 mb-8 text-sm">Pick any name. Everything stays on your device.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 30 }}
            className="space-y-6"
          >
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Wallet"
                autoFocus
                className="w-full bg-transparent border-b border-zinc-800 px-0 py-4 text-xl text-white placeholder:text-zinc-700 focus:outline-none transition-all duration-300"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>

            <motion.button
              onClick={handleCreate}
              disabled={!name.trim() || loading}
              whileHover={name.trim() && !loading ? { scale: 1.01 } : {}}
              whileTap={name.trim() && !loading ? { scale: 0.98 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="btn-primary w-full py-4 rounded-full bg-[#00e5a0] text-black font-semibold text-base disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Setting up...
                </span>
              ) : (
                "Create wallet"
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

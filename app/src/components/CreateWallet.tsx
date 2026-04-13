"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useWalletStore } from "@/lib/wallet-store";

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative noise">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-[#00e5a0]/[0.03] blur-[100px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-[#0ea5e9]/[0.03] blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#8b5cf6]/[0.02] blur-[120px]" />
      </div>

      {step === "hero" ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 max-w-2xl w-full text-center"
        >
          {/* Logo mark */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-8"
          >
            <div className="inline-flex relative">
              <div className="w-16 h-16 rounded-2xl bg-[#00e5a0]/10 border border-[#00e5a0]/20 flex items-center justify-center pulse-ring">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="1.5">
                  <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
                  <path d="M12 22V12" />
                  <path d="M3 7l9 5 9-5" />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl sm:text-7xl font-bold tracking-tight mb-4"
          >
            <span className="shimmer">Quantum Vault</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg sm:text-xl text-zinc-500 max-w-md mx-auto mb-12 leading-relaxed"
          >
            The first wallet that survives quantum computers.
            Built on Solana. Ready today.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-8 sm:gap-12 mb-12"
          >
            {[
              { value: "256x", label: "hash iterations per key" },
              { value: "896B", label: "quantum-safe signatures" },
              { value: "0", label: "keys exposed after tx" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-mono font-bold text-white">{stat.value}</div>
                <div className="text-xs text-zinc-600 mt-1 max-w-[100px]">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setStep("create")}
            className="group relative px-8 py-4 rounded-full bg-[#00e5a0] text-black font-semibold text-base transition-all hover:shadow-[0_0_40px_rgba(0,229,160,0.3)]"
          >
            Get Started
            <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">&rarr;</span>
          </motion.button>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-xs text-zinc-700 mt-6"
          >
            No servers. No tracking. Keys never leave your device.
          </motion.p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 max-w-md w-full"
        >
          <button
            onClick={() => setStep("hero")}
            className="text-sm text-zinc-600 hover:text-zinc-400 mb-8 transition flex items-center gap-1"
          >
            <span>&larr;</span> Back
          </button>

          <h2 className="text-3xl font-bold text-white mb-2">Name your vault</h2>
          <p className="text-zinc-500 mb-8">This is stored locally on your device.</p>

          <div className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Wallet"
              autoFocus
              className="w-full bg-transparent border-b border-zinc-800 focus:border-[#00e5a0]/50 px-0 py-4 text-xl text-white placeholder:text-zinc-700 focus:outline-none transition"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />

            <button
              onClick={handleCreate}
              disabled={!name.trim() || loading}
              className="w-full py-4 rounded-full bg-[#00e5a0] text-black font-semibold text-base transition-all hover:shadow-[0_0_40px_rgba(0,229,160,0.3)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Generating keys...
                </span>
              ) : (
                "Create Quantum Vault"
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

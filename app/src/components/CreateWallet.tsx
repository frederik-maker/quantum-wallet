"use client";

import { useState } from "react";
import { Shield, ArrowRight, Zap } from "lucide-react";
import { useWalletStore } from "@/lib/wallet-store";

export function CreateWallet() {
  const [name, setName] = useState("");
  const initializeWallet = useWalletStore((s) => s.initializeWallet);
  const loading = useWalletStore((s) => s.loading);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await initializeWallet(name.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Logo & Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 mb-6 shadow-lg shadow-emerald-500/20">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Quantum Vault
          </h1>
          <p className="text-zinc-400 text-lg">
            The first quantum-resistant Solana wallet.
            <br />
            <span className="text-zinc-500">
              One-time signatures. Automatic key rotation. Zero exposure.
            </span>
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: "🛡️", title: "Quantum Safe", desc: "Winternitz signatures" },
            { icon: "🔄", title: "Auto Rotate", desc: "Keys change every tx" },
            { icon: "⚡", title: "Works Today", desc: "No protocol upgrade" },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-center"
            >
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-xs font-medium text-white">{f.title}</div>
              <div className="text-xs text-zinc-500">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Create Wallet Form */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Create Your Wallet
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1.5 block">
                Wallet Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Quantum Wallet"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:from-emerald-400 hover:to-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Zap className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Quantum Wallet
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Your keys never leave this device. No servers. No tracking.
        </p>
      </div>
    </div>
  );
}

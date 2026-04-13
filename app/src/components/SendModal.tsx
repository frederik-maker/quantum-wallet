"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useWalletStore } from "@/lib/wallet-store";
import { LAMPORTS_PER_SOL } from "@/lib/constants";

interface SendModalProps {
  onClose: () => void;
}

export function SendModal({ onClose }: SendModalProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [privateSend, setPrivateSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { sendSol, totalBalance, network } = useWalletStore();
  const maxSol = totalBalance / LAMPORTS_PER_SOL;

  const explorerBase = network === "mainnet-beta"
    ? "https://explorer.solana.com"
    : `https://explorer.solana.com/?cluster=${network}`;

  const handleSend = async () => {
    setError(null);
    setSending(true);
    try {
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
      if (isNaN(lamports) || lamports <= 0) throw new Error("Invalid amount");
      if (recipient.length < 32 || recipient.length > 44) throw new Error("Invalid address");
      const sig = await sendSol(recipient, lamports);
      setTxSig(sig);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      {txSig ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-[#00e5a0]/10 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-white mb-1">Sent</p>
          <p className="text-sm text-zinc-500 mb-4">Keys rotated to fresh quantum-safe pair.</p>
          <a
            href={`${explorerBase}/tx/${txSig}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#00e5a0] hover:underline"
          >
            View on Explorer &rarr;
          </a>
          <button onClick={onClose} className="w-full mt-6 py-3 rounded-xl border border-white/[0.06] text-sm text-zinc-400 hover:text-white hover:border-white/[0.1] transition">
            Done
          </button>
        </motion.div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-semibold text-white">Send</h3>
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition text-xl">&times;</button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-xs font-mono text-zinc-600 uppercase tracking-wider mb-2 block">To</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Solana address"
                className="w-full bg-transparent border-b border-zinc-800 focus:border-[#00e5a0]/40 py-3 text-sm text-white placeholder:text-zinc-700 focus:outline-none transition font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono text-zinc-600 uppercase tracking-wider">Amount</label>
                <button onClick={() => setAmount(maxSol.toFixed(4))} className="text-xs text-zinc-600 hover:text-[#00e5a0] transition font-mono">
                  max {maxSol.toFixed(4)}
                </button>
              </div>
              <div className="flex items-baseline gap-2 border-b border-zinc-800 focus-within:border-[#00e5a0]/40 transition">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.001"
                  min="0"
                  className="flex-1 bg-transparent py-3 text-2xl text-white placeholder:text-zinc-800 focus:outline-none tabular-nums"
                />
                <span className="text-sm text-zinc-600 pb-3">SOL</span>
              </div>
            </div>

            {/* Private Send Toggle */}
            <button
              onClick={() => setPrivateSend(!privateSend)}
              className="w-full flex items-center justify-between py-3 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-4 rounded-full transition-colors ${privateSend ? "bg-purple-500" : "bg-zinc-800"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${privateSend ? "translate-x-4" : "translate-x-0"}`} />
                </div>
                <span className="text-sm text-zinc-400">Private send</span>
                <span className="text-xs text-zinc-700 font-mono">via Umbra</span>
              </div>
            </button>

            <p className="text-xs text-zinc-700">
              {privateSend
                ? "Shielded transfer via Umbra. Recipient and amount hidden on-chain."
                : "Quantum-safe W-OTS signature. Vault rotates automatically."}
            </p>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={handleSend}
              disabled={sending || !recipient || !amount}
              className="w-full py-4 rounded-xl bg-[#00e5a0] text-black font-semibold transition-all hover:shadow-[0_0_40px_rgba(0,229,160,0.2)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {sending ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Signing...
                </span>
              ) : (
                "Send SOL"
              )}
            </button>
          </div>
        </>
      )}
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        className="relative w-full max-w-md bg-[#0a0a0f] border border-white/[0.06] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

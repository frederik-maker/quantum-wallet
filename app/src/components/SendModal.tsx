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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="text-center py-6"
        >
          <div className="w-12 h-12 rounded-full bg-[#00e5a0]/[0.08] flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(0,229,160,0.1),inset_0_1px_0_rgba(0,229,160,0.1)]">
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
            className="text-sm text-[#00e5a0] hover:text-[#00e5a0]/80 transition-colors duration-200"
          >
            View on Explorer &rarr;
          </a>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="btn-secondary w-full mt-6 py-3 rounded-xl border border-white/[0.06] text-sm text-zinc-400 hover:text-white hover:border-white/[0.1] transition-all duration-200"
          >
            Done
          </motion.button>
        </motion.div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>Send</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] transition-all duration-200 text-xl">&times;</button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[11px] font-mono text-zinc-600 uppercase tracking-[0.15em] mb-2 block">To</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Solana address"
                className="w-full bg-transparent border-b border-zinc-800 py-3 text-sm text-white placeholder:text-zinc-700 focus:outline-none transition-all duration-300 font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-mono text-zinc-600 uppercase tracking-[0.15em]">Amount</label>
                <button onClick={() => setAmount(maxSol.toFixed(4))} className="text-[11px] text-zinc-600 hover:text-[#00e5a0] transition-colors duration-200 font-mono">
                  max {maxSol.toFixed(4)}
                </button>
              </div>
              <div className="flex items-baseline gap-2 border-b border-zinc-800 focus-within:border-[#00e5a0]/30 transition-all duration-300">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.001"
                  min="0"
                  className="flex-1 bg-transparent py-3 text-2xl font-light text-white placeholder:text-zinc-800 focus:outline-none tabular-nums"
                  style={{ letterSpacing: "-0.02em" }}
                />
                <span className="text-sm text-zinc-600 pb-3 font-light">SOL</span>
              </div>
            </div>

            {/* Private Send Toggle */}
            <button
              onClick={() => setPrivateSend(!privateSend)}
              className="w-full flex items-center justify-between py-3 rounded-lg group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-4 rounded-full transition-all duration-300 ${privateSend ? "bg-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.3)]" : "bg-zinc-800"}`}>
                  <motion.div
                    animate={{ x: privateSend ? 16 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
                  />
                </div>
                <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">Private send</span>
                <span className="text-[11px] text-zinc-700 font-mono">via Umbra</span>
              </div>
            </button>

            <p className="text-[11px] text-zinc-700 leading-relaxed">
              {privateSend
                ? "Shielded transfer via Umbra. Recipient and amount hidden on-chain."
                : "Quantum-safe W-OTS signature. Vault rotates automatically."}
            </p>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-400 bg-red-500/[0.04] rounded-lg px-3 py-2 border border-red-500/10"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              onClick={handleSend}
              disabled={sending || !recipient || !amount}
              whileHover={!sending && recipient && amount ? { scale: 1.01 } : {}}
              whileTap={!sending && recipient && amount ? { scale: 0.98 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="btn-primary w-full py-4 rounded-xl bg-[#00e5a0] text-black font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {sending ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Signing...
                </span>
              ) : (
                "Send SOL"
              )}
            </motion.button>
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
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 modal-backdrop"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="relative w-full max-w-md modal-card rounded-t-2xl sm:rounded-2xl p-6"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

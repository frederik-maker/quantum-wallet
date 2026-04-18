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

  const { sendSol, totalBalance, network, rpcUrl, feePayerSecret } = useWalletStore();
  const maxSol = totalBalance / LAMPORTS_PER_SOL;

  const explorerBase = "https://explorer.solana.com";
  const clusterParam = network === "mainnet-beta" ? "" : `?cluster=${network}`;

  const handleSend = async () => {
    setError(null);
    setSending(true);
    try {
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
      if (isNaN(lamports) || lamports <= 0) throw new Error("Invalid amount");
      if (recipient.length < 32 || recipient.length > 44) throw new Error("Invalid address");

      if (privateSend) {
        if (!feePayerSecret) throw new Error("Wallet not initialized");
        const { sendPrivateTransfer } = await import("@/lib/umbra");

        const sigs = await sendPrivateTransfer(
          {
            network: network === "mainnet-beta" ? "mainnet" : "devnet",
            rpcUrl,
            feePayerSecret,
          },
          recipient,
          BigInt(lamports)
        );
        const sig = Array.isArray(sigs) ? sigs[0] : String(sigs);
        setTxSig(sig);
        // Record the private send in activity — the Umbra path bypasses sendSol,
        // which is where regular sends get logged.
        useWalletStore.setState((s) => ({
          history: [
            ...s.history,
            {
              id: `umbra-send-${Date.now()}`,
              type: "send" as const,
              amount: lamports,
              counterparty: recipient,
              signature: sig,
              timestamp: Date.now(),
              status: "confirmed" as const,
            },
          ],
        }));
        useWalletStore.getState().refreshBalances();
      } else {
        const sig = await sendSol(recipient, lamports);
        setTxSig(sig);
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Failed";
      // Friendlier messages for common Umbra failures.
      const lower = raw.toLowerCase();
      let friendly = raw;
      if (lower.includes("receiver is not registered") || (lower.includes("receiver") && lower.includes("not registered"))) {
        friendly = "The recipient isn't registered with Umbra on this network. Both sender and recipient must register before private transfers work. If you're sending to yourself and see this, your own registration didn't land — go to Privacy → Re-register.";
      } else if (lower.includes("sender is not registered") || (lower.includes("sender") && lower.includes("not registered"))) {
        friendly = "Your Umbra registration didn't land on this network. Go to Privacy → Re-register, then try again.";
      } else if (lower.includes("timestampinfuture") || lower.includes("timestamp") && lower.includes("future")) {
        friendly = "Devnet cluster clock is lagging — Umbra rejects the tx as too-recent. Switch to mainnet or retry in 30 seconds.";
      }
      setError(friendly);
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
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${privateSend ? "bg-purple-500/[0.08] shadow-[0_0_24px_rgba(139,92,246,0.1)]" : "bg-[#00e5a0]/[0.08] shadow-[0_0_24px_rgba(0,229,160,0.1)]"}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={privateSend ? "#8b5cf6" : "#00e5a0"} strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-white mb-1">
            {privateSend ? "Private transfer sent" : "Sent successfully"}
          </p>
          <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
            {privateSend ? (
              <>
                Encrypted into Umbra&apos;s mixer pool. The recipient has a claimable UTXO waiting —
                on their end they scan the pool, decrypt the note with their Umbra key,
                and claim it into their encrypted balance. On chain, no one can see the
                amount or who it went to.
              </>
            ) : (
              <>Keys rotated to fresh quantum-safe pair.</>
            )}
          </p>
          <a
            href={`${explorerBase}/tx/${txSig}${clusterParam}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[#00e5a0] hover:text-[#00e5a0]/80 transition-colors"
          >
            View on Explorer
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
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
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${privateSend ? "bg-purple-500/[0.08]" : "bg-white/[0.04]"}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={privateSend ? "#8b5cf6" : "currentColor"} strokeWidth="2" className={privateSend ? "" : "text-zinc-400"}>
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>Send</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-all duration-200 text-xl">&times;</button>
          </div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <label className="text-[12px] font-mono text-zinc-400 uppercase tracking-[0.15em] mb-2 block">To</label>
              <div className="relative">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Solana address"
                  className="w-full bg-transparent border-b border-zinc-800 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-all duration-300 font-mono focus:border-transparent"
                />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-zinc-800" />
                {recipient.trim() && (
                  <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#00e5a0]/40 via-[#00e5a0]/60 to-[#0ea5e9]/40 origin-left" />
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12px] font-mono text-zinc-400 uppercase tracking-[0.15em]">Amount</label>
                <button onClick={() => setAmount(maxSol.toFixed(4))} className="text-[12px] text-zinc-400 hover:text-[#00e5a0] transition-colors duration-200 font-mono">
                  max {maxSol.toFixed(4)}
                </button>
              </div>
              <div className="relative">
                <div className="flex items-baseline gap-2 border-b border-zinc-800 focus-within:border-transparent transition-all duration-300">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.001"
                    min="0"
                    className="flex-1 bg-transparent py-3 text-2xl font-light text-white placeholder:text-zinc-600 focus:outline-none tabular-nums"
                    style={{ letterSpacing: "-0.02em" }}
                  />
                  <span className="text-sm text-zinc-500 pb-3 font-light">SOL</span>
                </div>
                {amount && parseFloat(amount) > 0 && (
                  <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#00e5a0]/40 via-[#00e5a0]/60 to-[#0ea5e9]/40 origin-left" />
                )}
              </div>
            </motion.div>

            {/* Private Send Toggle */}
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              onClick={() => setPrivateSend(!privateSend)}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-5 rounded-full transition-all duration-300 relative ${privateSend ? "bg-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.3)]" : "bg-zinc-800"}`}>
                  <motion.div
                    animate={{ x: privateSend ? 16 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
                  />
                </div>
                <div className="text-left">
                  <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors block">Private send</span>
                  <span className="text-[11px] text-zinc-500 block">
                    {privateSend ? "Shielded via Umbra ZK proofs" : "Uses standard quantum-safe transfer"}
                  </span>
                </div>
              </div>
              {privateSend && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/[0.08] border border-purple-500/[0.12]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  <span className="text-[9px] font-mono text-purple-400">ZK</span>
                </div>
              )}
            </motion.button>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-red-400 bg-red-500/[0.04] rounded-xl px-4 py-3 border border-red-500/10"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                {error}
              </motion.div>
            )}

            <motion.button
              onClick={handleSend}
              disabled={sending || !recipient || !amount}
              whileHover={!sending && recipient && amount ? { scale: 1.01 } : {}}
              whileTap={!sending && recipient && amount ? { scale: 0.98 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`btn-primary w-full py-4 rounded-xl font-semibold disabled:opacity-30 disabled:cursor-not-allowed ${
                privateSend
                  ? "bg-purple-500 text-white hover:bg-purple-400 glow-btn-purple"
                  : "bg-[#00e5a0] text-black"
              }`}
            >
              {sending ? (
                <span className="inline-flex items-center gap-2">
                  <span className={`w-4 h-4 border-2 rounded-full animate-spin ${privateSend ? "border-white/30 border-t-white" : "border-black/30 border-t-black"}`} />
                  {privateSend ? "Shielding..." : "Signing..."}
                </span>
              ) : privateSend ? (
                "Send privately"
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 16, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 8, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className="relative w-full max-w-md modal-glass p-6"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

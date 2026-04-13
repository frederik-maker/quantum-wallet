"use client";

import { useState } from "react";
import { X, Send, AlertTriangle, Loader2 } from "lucide-react";
import { useWalletStore } from "@/lib/wallet-store";
import { LAMPORTS_PER_SOL } from "@/lib/constants";

interface SendModalProps {
  onClose: () => void;
}

export function SendModal({ onClose }: SendModalProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { sendSol, totalBalance, network } = useWalletStore();
  const maxSol = totalBalance / LAMPORTS_PER_SOL;

  const handleSend = async () => {
    setError(null);
    setSending(true);

    try {
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
      if (isNaN(lamports) || lamports <= 0) {
        throw new Error("Invalid amount");
      }
      if (recipient.length < 32 || recipient.length > 44) {
        throw new Error("Invalid Solana address");
      }

      const sig = await sendSol(recipient, lamports);
      setTxSig(sig);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setSending(false);
    }
  };

  const explorerBase =
    network === "mainnet-beta"
      ? "https://explorer.solana.com"
      : `https://explorer.solana.com/?cluster=${network}`;

  if (txSig) {
    return (
      <ModalOverlay onClose={onClose}>
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Sent!</h3>
          <p className="text-sm text-zinc-400 mb-4">
            {amount} SOL sent successfully. Vault rotated to new quantum-safe keys.
          </p>
          <a
            href={`${explorerBase}/tx/${txSig}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-emerald-400 hover:text-emerald-300 underline"
          >
            View on Explorer
          </a>
          <button
            onClick={onClose}
            className="w-full mt-4 bg-zinc-800 text-white py-2.5 rounded-xl hover:bg-zinc-700 transition"
          >
            Done
          </button>
        </div>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Send SOL</h3>
        <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg transition">
          <X className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      {/* Quantum Safety Notice */}
      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-4 py-3 mb-4">
        <p className="text-xs text-emerald-400/80">
          This transaction uses quantum-resistant Winternitz signatures. Your vault keys will automatically rotate after sending.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-zinc-400 mb-1.5 block">Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter Solana address..."
            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition font-mono text-sm"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm text-zinc-400">Amount (SOL)</label>
            <button
              onClick={() => setAmount(maxSol.toFixed(4))}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              Max: {maxSol.toFixed(4)}
            </button>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            step="0.001"
            min="0"
            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition text-lg"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !recipient || !amount}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:from-blue-400 hover:to-cyan-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Signing & Rotating...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send SOL
            </>
          )}
        </button>
      </div>
    </ModalOverlay>
  );
}

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        {children}
      </div>
    </div>
  );
}

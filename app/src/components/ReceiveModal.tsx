"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Keypair } from "@solana/web3.js";
import { useWalletStore } from "@/lib/wallet-store";

interface ReceiveModalProps {
  onClose: () => void;
}

export function ReceiveModal({ onClose }: ReceiveModalProps) {
  const { vaults, feePayerSecret } = useWalletStore();
  const [copied, setCopied] = useState<string | null>(null);

  const activeVaults = vaults.filter((v) => v.status === "active");
  const receiveAddress = activeVaults[0]?.address;

  const feePayerAddress = useMemo(() => {
    if (!feePayerSecret) return null;
    return Keypair.fromSecretKey(Uint8Array.from(feePayerSecret)).publicKey.toBase58();
  }, [feePayerSecret]);

  const copy = useCallback((addr: string, label: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>Receive</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] transition-all duration-200 text-xl">&times;</button>
      </div>

      {receiveAddress ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div>
            <label className="text-[11px] font-mono text-zinc-600 uppercase tracking-[0.15em] mb-2.5 block">
              Vault Address
            </label>
            <motion.button
              onClick={() => copy(receiveAddress, "vault")}
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.995 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-full text-left card-glow rounded-xl p-4 hover:border-[#00e5a0]/15 transition-colors duration-300 group"
            >
              <code className="text-sm text-zinc-400 font-mono break-all leading-relaxed group-hover:text-white transition-colors duration-200">
                {receiveAddress}
              </code>
              <p className="text-[11px] text-zinc-700 mt-2 group-hover:text-[#00e5a0] transition-colors duration-200">
                {copied === "vault" ? "Copied!" : "Click to copy"}
              </p>
            </motion.button>
          </div>

          <div className="bg-amber-500/[0.03] border border-amber-500/10 rounded-xl p-4 shadow-[inset_0_1px_0_rgba(245,158,11,0.03)]">
            <p className="text-[11px] text-amber-400/70 leading-relaxed">
              <strong className="text-amber-400/90">Address changes after each spend.</strong>{" "}
              One-time keys mean your receive address rotates with every transaction. Always use the latest address shown here.
            </p>
          </div>

          {feePayerAddress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <label className="text-[11px] font-mono text-zinc-700 uppercase tracking-[0.15em] mb-2 block">
                Fee Payer (for devnet airdrops)
              </label>
              <button
                onClick={() => copy(feePayerAddress, "fee")}
                className="w-full text-left group"
              >
                <code className="text-[11px] text-zinc-700 font-mono break-all hover:text-zinc-400 transition-colors duration-200">
                  {feePayerAddress}
                </code>
                <span className="text-[11px] text-zinc-800 ml-2">
                  {copied === "fee" ? "copied" : ""}
                </span>
              </button>
            </motion.div>
          )}
        </motion.div>
      ) : (
        <div className="py-12 text-center empty-state-pattern rounded-xl">
          <div className="relative z-10">
            <div className="mx-auto mb-3 w-10 h-10 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-700">
                <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm font-medium">No active vaults</p>
            <p className="text-zinc-700 text-xs mt-1">Fund your wallet to create one.</p>
          </div>
        </div>
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

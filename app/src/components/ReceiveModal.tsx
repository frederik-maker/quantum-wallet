"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Keypair } from "@solana/web3.js";
import QRCode from "react-qr-code";
import { useWalletStore } from "@/lib/wallet-store";

interface ReceiveModalProps {
  onClose: () => void;
}

export function ReceiveModal({ onClose }: ReceiveModalProps) {
  const { vaults, feePayerSecret } = useWalletStore();
  const [copied, setCopied] = useState<string | null>(null);

  const activeVaults = vaults.filter((v) => v.status === "active");
  const vaultAddress = activeVaults[0]?.address;

  const feePayerAddress = useMemo(() => {
    if (!feePayerSecret) return null;
    return Keypair.fromSecretKey(Uint8Array.from(feePayerSecret)).publicKey.toBase58();
  }, [feePayerSecret]);

  const primaryAddress = vaultAddress || feePayerAddress;

  const copy = useCallback((addr: string, label: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg receive-icon-glow border flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>Receive</h3>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-all duration-200 text-xl">&times;</button>
      </div>

      {primaryAddress ? (
        <div className="space-y-5">
          {/* QR Code with glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
            className="flex justify-center py-4"
          >
            <div className="relative">
              {/* Ambient glow behind QR */}
              <div className="absolute inset-0 bg-[#0ea5e9]/[0.06] blur-[40px] rounded-full scale-150" />
              <div className="absolute inset-0 bg-[#00e5a0]/[0.04] blur-[60px] rounded-full scale-[1.8]" />
              <div className="relative qr-container rounded-2xl p-[1px]">
                <div className="bg-white rounded-2xl p-4">
                  <QRCode value={primaryAddress} size={180} level="M" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Address type label */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-5 h-5 rounded-md flex items-center justify-center ${vaultAddress ? "bg-[#00e5a0]/[0.08]" : "bg-cyan-500/[0.08]"}`}>
                {vaultAddress ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" /></svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">
                {vaultAddress ? "Vault address" : "Wallet address"}
              </p>
            </div>

            <button
              onClick={() => copy(primaryAddress, "primary")}
              className="w-full text-left p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#0ea5e9]/20 hover:bg-[#0ea5e9]/[0.02] transition-all duration-300 group"
            >
              <code className="text-[13px] text-zinc-400 font-mono break-all leading-relaxed group-hover:text-white transition-colors">
                {primaryAddress}
              </code>
              <div className="flex items-center gap-2 mt-2.5">
                {copied === "primary" ? (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                    <span className="text-[11px] text-[#00e5a0] font-medium">Copied!</span>
                  </motion.div>
                ) : (
                  <div className="flex items-center gap-1.5 text-zinc-500 group-hover:text-[#0ea5e9] transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                    <span className="text-[11px]">Click to copy</span>
                  </div>
                )}
              </div>
            </button>
          </motion.div>

          {/* Info notices */}
          {vaultAddress && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-400/[0.04] border border-amber-400/[0.08]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400/60 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
              <p className="text-[11px] text-amber-400/60 leading-relaxed">
                This address changes after each send. Always use the latest one.
              </p>
            </motion.div>
          )}

          {!vaultAddress && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Send SOL here to fund your wallet. Once funded, create a vault for quantum protection.
              </p>
            </motion.div>
          )}

          {/* Fee payer address */}
          {vaultAddress && feePayerAddress && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
              className="pt-3 border-t border-white/[0.04]"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded bg-zinc-800 flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-500"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                </div>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Fee payer</p>
              </div>
              <button
                onClick={() => copy(feePayerAddress, "fee")}
                className="flex items-center gap-2 group px-3 py-2 -mx-3 rounded-lg hover:bg-white/[0.02] transition-all"
              >
                <code className="text-[10px] text-zinc-600 font-mono break-all group-hover:text-zinc-400 transition-colors">
                  {feePayerAddress}
                </code>
                {copied === "fee" ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2.5" className="shrink-0"><path d="M20 6L9 17l-5-5" /></svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600 group-hover:text-zinc-400 shrink-0 transition-colors"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                )}
              </button>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="py-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
          </div>
          <p className="text-sm text-zinc-500">No wallet initialized.</p>
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

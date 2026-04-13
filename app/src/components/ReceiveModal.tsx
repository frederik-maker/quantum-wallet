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
        <h3 className="text-lg font-semibold text-white">Receive</h3>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition text-xl">&times;</button>
      </div>

      {receiveAddress ? (
        <div className="space-y-6">
          <div>
            <label className="text-xs font-mono text-zinc-600 uppercase tracking-wider mb-2 block">
              Vault Address
            </label>
            <button
              onClick={() => copy(receiveAddress, "vault")}
              className="w-full text-left bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:border-[#00e5a0]/20 transition group"
            >
              <code className="text-sm text-zinc-400 font-mono break-all leading-relaxed group-hover:text-white transition">
                {receiveAddress}
              </code>
              <p className="text-xs text-zinc-700 mt-2 group-hover:text-[#00e5a0] transition">
                {copied === "vault" ? "Copied!" : "Click to copy"}
              </p>
            </button>
          </div>

          <div className="bg-amber-500/[0.04] border border-amber-500/10 rounded-xl p-4">
            <p className="text-xs text-amber-400/70 leading-relaxed">
              <strong className="text-amber-400">Address changes after each spend.</strong>{" "}
              One-time keys mean your receive address rotates with every transaction. Always use the latest address shown here.
            </p>
          </div>

          {feePayerAddress && (
            <div>
              <label className="text-xs font-mono text-zinc-700 uppercase tracking-wider mb-2 block">
                Fee Payer (for devnet airdrops)
              </label>
              <button
                onClick={() => copy(feePayerAddress, "fee")}
                className="w-full text-left"
              >
                <code className="text-xs text-zinc-700 font-mono break-all hover:text-zinc-400 transition">
                  {feePayerAddress}
                </code>
                <span className="text-xs text-zinc-800 ml-2">{copied === "fee" ? "copied" : ""}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-zinc-500 text-sm">No active vaults</p>
          <p className="text-zinc-700 text-xs mt-1">Fund your wallet to create one.</p>
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

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useWalletStore } from "@/lib/wallet-store";
import bs58 from "bs58";

interface MigrateModalProps {
  onClose: () => void;
}

export function MigrateModal({ onClose }: MigrateModalProps) {
  const [secretKey, setSecretKey] = useState("");
  const [migrating, setMigrating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const { importLegacyWallet } = useWalletStore();

  const handleMigrate = async () => {
    setError(null);
    setMigrating(true);
    try {
      let keyBytes: Uint8Array;
      try {
        keyBytes = bs58.decode(secretKey.trim());
      } catch {
        try {
          keyBytes = Uint8Array.from(JSON.parse(secretKey.trim()));
        } catch {
          throw new Error("Invalid key format. Use base58 or JSON array.");
        }
      }
      if (keyBytes.length !== 64) throw new Error("Invalid key length (expected 64 bytes)");
      await importLegacyWallet(keyBytes);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Migration failed");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Overlay onClose={onClose}>
      {success ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="text-center py-6">
          <div className="w-14 h-14 rounded-2xl bg-[#00e5a0]/[0.08] flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(0,229,160,0.1)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-white mb-1">Protected</p>
          <p className="text-sm text-zinc-400 mb-5">Your funds are now quantum-safe.</p>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="btn-secondary w-full py-3 rounded-xl border border-white/[0.06] text-sm text-zinc-400 hover:text-white transition"
          >
            Done
          </motion.button>
        </motion.div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#00e5a0]/[0.06] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2">
                  <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Import Wallet</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-all text-xl">&times;</button>
          </div>

          <div className="space-y-6">
            {/* Migration flow visual — dramatic transformation */}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="flex items-center justify-center gap-3 py-4 px-4 rounded-xl bg-white/[0.015] border border-white/[0.04]"
            >
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-xl bg-red-500/[0.06] border border-red-500/[0.1] flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /><path d="M4 4l16 16" opacity="0.4" /></svg>
                </div>
                <span className="text-[11px] font-mono text-red-400/80">Ed25519</span>
                <span className="text-[10px] text-zinc-500">vulnerable</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 px-2">
                <div className="flex items-center gap-1">
                  <div className="w-6 h-px bg-gradient-to-r from-red-500/30 to-[#00e5a0]/30" />
                  <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </motion.div>
                  <div className="w-6 h-px bg-gradient-to-r from-[#00e5a0]/30 to-[#00e5a0]/50" />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">migrate</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-xl bg-[#00e5a0]/[0.06] border border-[#00e5a0]/[0.12] flex items-center justify-center shadow-[0_0_16px_rgba(0,229,160,0.06)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="1.5"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" /><path d="M12 22V12" opacity="0.4" /><path d="M3 7l9 5 9-5" opacity="0.4" /></svg>
                </div>
                <span className="text-[11px] font-mono text-[#00e5a0]/80">W-OTS</span>
                <span className="text-[10px] text-[#00e5a0]/60">quantum-safe</span>
              </div>
            </motion.div>

            {/* Warning */}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="flex items-start gap-3 bg-red-500/[0.04] border border-red-500/10 rounded-xl p-4"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400/70 mt-0.5 shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4M12 17h.01" /></svg>
              <p className="text-[13px] text-red-400/80 leading-relaxed">
                <strong className="text-red-400">This is irreversible.</strong>{" "}
                Funds transfer from your legacy wallet into a quantum-safe vault. The old address will be empty.
              </p>
            </motion.div>

            {/* Secret key input */}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <label className="text-[12px] font-mono text-zinc-400 uppercase tracking-[0.15em] mb-2 block">Secret Key</label>
              <textarea
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Base58 or JSON byte array"
                rows={3}
                className="w-full bg-transparent border border-zinc-800 focus:border-[#00e5a0]/30 rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-zinc-500 focus:outline-none transition font-mono resize-none"
              />
              <p className="text-[11px] text-zinc-400 mt-1.5 flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                Processed locally. Never sent anywhere.
              </p>
            </motion.div>

            {/* Confirmation */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-zinc-700 bg-transparent text-[#00e5a0] focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-[13px] text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                I understand this transfers all funds to a quantum-safe vault and cannot be undone.
              </span>
            </label>

            {/* Error */}
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

            {/* Submit */}
            <motion.button
              onClick={handleMigrate}
              disabled={migrating || !secretKey.trim() || !confirmed}
              whileHover={!migrating && secretKey.trim() && confirmed ? { scale: 1.01 } : {}}
              whileTap={!migrating && secretKey.trim() && confirmed ? { scale: 0.98 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="btn-primary w-full py-4 rounded-xl bg-[#00e5a0] text-black font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {migrating ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Migrating...
                </span>
              ) : (
                "Migrate to Quantum Vault"
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

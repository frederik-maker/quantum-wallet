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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-[#00e5a0]/10 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="2">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-white mb-1">Protected</p>
          <p className="text-sm text-zinc-500 mb-4">Your funds are now quantum-safe.</p>
          <button onClick={onClose} className="w-full py-3 rounded-xl border border-white/[0.06] text-sm text-zinc-400 hover:text-white transition">
            Done
          </button>
        </motion.div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-semibold text-white">Import Wallet</h3>
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition text-xl">&times;</button>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span className="px-2 py-1 rounded bg-white/[0.04] text-zinc-400 font-mono">Ed25519</span>
              <span className="text-zinc-700">&rarr;</span>
              <span className="px-2 py-1 rounded bg-[#00e5a0]/10 text-[#00e5a0] font-mono">W-OTS</span>
            </div>

            <div className="bg-red-500/[0.04] border border-red-500/10 rounded-xl p-4">
              <p className="text-xs text-red-400/80 leading-relaxed">
                <strong className="text-red-400">This is irreversible.</strong>{" "}
                Funds transfer from your legacy wallet into a quantum-safe vault. The old address will be empty.
              </p>
            </div>

            <div>
              <label className="text-xs font-mono text-zinc-600 uppercase tracking-wider mb-2 block">Secret Key</label>
              <textarea
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Base58 or JSON byte array"
                rows={3}
                className="w-full bg-transparent border border-zinc-800 focus:border-[#00e5a0]/30 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-700 focus:outline-none transition font-mono resize-none"
              />
              <p className="text-xs text-zinc-800 mt-1">Processed locally. Never sent anywhere.</p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-zinc-700 bg-transparent text-[#00e5a0] focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs text-zinc-500 leading-relaxed">
                I understand this transfers all funds to a quantum-safe vault and cannot be undone.
              </span>
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={handleMigrate}
              disabled={migrating || !secretKey.trim() || !confirmed}
              className="w-full py-4 rounded-xl bg-[#00e5a0] text-black font-semibold transition-all hover:shadow-[0_0_40px_rgba(0,229,160,0.2)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {migrating ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Migrating...
                </span>
              ) : (
                "Migrate to Quantum Vault"
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

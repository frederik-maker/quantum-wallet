"use client";

import { useState } from "react";
import { X, AlertTriangle, Wallet, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
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

      // Try base58 first, then JSON array
      try {
        keyBytes = bs58.decode(secretKey.trim());
      } catch {
        try {
          const arr = JSON.parse(secretKey.trim());
          keyBytes = Uint8Array.from(arr);
        } catch {
          throw new Error(
            "Invalid secret key format. Use base58 or JSON array."
          );
        }
      }

      if (keyBytes.length !== 64) {
        throw new Error("Invalid secret key length (expected 64 bytes)");
      }

      await importLegacyWallet(keyBytes);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Migration failed");
    } finally {
      setMigrating(false);
    }
  };

  if (success) {
    return (
      <ModalOverlay onClose={onClose}>
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Migration Complete
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Your funds are now protected by quantum-resistant Winternitz signatures.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-zinc-800 text-white py-2.5 rounded-xl hover:bg-zinc-700 transition"
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
        <h3 className="text-lg font-semibold text-white">Migrate Wallet</h3>
        <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg transition">
          <X className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Warning */}
        <div className="bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-red-400 font-medium mb-1">
                Irreversible Process
              </p>
              <p className="text-xs text-zinc-500">
                Funds will be transferred from your legacy Ed25519 wallet to a quantum-safe
                Winternitz vault. Your old wallet address will no longer hold these funds.
                This cannot be undone.
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl px-4 py-3">
          <p className="text-xs text-zinc-400 font-medium mb-2">How Migration Works</p>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="bg-zinc-700 px-2 py-0.5 rounded">Ed25519 Wallet</span>
            <ArrowRight className="w-3 h-3" />
            <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
              Quantum Vault
            </span>
          </div>
        </div>

        <div>
          <label className="text-sm text-zinc-400 mb-1.5 block">
            Legacy Wallet Secret Key
          </label>
          <textarea
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="Base58 encoded secret key or JSON byte array..."
            rows={3}
            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition font-mono text-xs resize-none"
          />
          <p className="text-xs text-zinc-600 mt-1">
            Your key is processed locally and never sent to any server.
          </p>
        </div>

        {/* Confirmation checkbox */}
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/20"
          />
          <span className="text-xs text-zinc-400">
            I understand this will transfer all funds from my legacy wallet to a quantum-safe
            vault. The old address will no longer hold these funds.
          </span>
        </label>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleMigrate}
          disabled={migrating || !secretKey.trim() || !confirmed}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:from-purple-400 hover:to-pink-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {migrating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Migrating...
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              Migrate to Quantum Vault
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

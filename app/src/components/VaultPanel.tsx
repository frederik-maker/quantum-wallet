"use client";

import { useState } from "react";
import { Shield, Plus, Loader2, ExternalLink } from "lucide-react";
import { useWalletStore } from "@/lib/wallet-store";
import { LAMPORTS_PER_SOL } from "@/lib/constants";

export function VaultPanel() {
  const { vaults, openNewVault, network, loading } = useWalletStore();
  const [opening, setOpening] = useState(false);

  const activeVaults = vaults.filter((v) => v.status === "active");
  const spentVaults = vaults.filter((v) => v.status === "spent");

  const explorerBase =
    network === "mainnet-beta"
      ? "https://explorer.solana.com"
      : `https://explorer.solana.com/?cluster=${network}`;

  const handleOpenVault = async () => {
    setOpening(true);
    try {
      await openNewVault();
    } catch (err) {
      console.error("Failed to open vault:", err);
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">Vault Pool</h3>
        <button
          onClick={handleOpenVault}
          disabled={opening}
          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition"
        >
          {opening ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          Open New Vault
        </button>
      </div>

      {/* Active Vaults */}
      {activeVaults.length === 0 ? (
        <p className="text-xs text-zinc-600">No active vaults. Open one to get started.</p>
      ) : (
        <div className="space-y-2">
          {activeVaults.map((vault) => (
            <div
              key={vault.id}
              className="bg-zinc-800/30 border border-zinc-800 rounded-lg px-3 py-2 flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <code className="text-xs text-zinc-400 font-mono truncate block">
                  {vault.address}
                </code>
                <span className="text-xs text-zinc-600">
                  {(vault.balance / LAMPORTS_PER_SOL).toFixed(4)} SOL
                </span>
              </div>
              <a
                href={`${explorerBase}/address/${vault.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-zinc-700 rounded transition shrink-0"
              >
                <ExternalLink className="w-3 h-3 text-zinc-600" />
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Spent Vaults Summary */}
      {spentVaults.length > 0 && (
        <p className="text-xs text-zinc-600">
          {spentVaults.length} rotated vault{spentVaults.length !== 1 ? "s" : ""} (keys destroyed)
        </p>
      )}

      {/* Explanation */}
      <div className="pt-2 border-t border-zinc-800/50">
        <p className="text-xs text-zinc-600 leading-relaxed">
          Each vault uses a unique Winternitz one-time signature keypair. After any spend,
          the vault is closed and a new one is created with fresh keys. This ensures your
          private key is never exposed long enough for a quantum attack.
        </p>
      </div>
    </div>
  );
}

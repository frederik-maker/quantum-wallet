"use client";

import { useState, useCallback } from "react";
import { X, Copy, Check, AlertTriangle, Shield } from "lucide-react";
import { useWalletStore } from "@/lib/wallet-store";

interface ReceiveModalProps {
  onClose: () => void;
}

export function ReceiveModal({ onClose }: ReceiveModalProps) {
  const { vaults, feePayerSecret } = useWalletStore();
  const [copied, setCopied] = useState(false);

  const activeVaults = vaults.filter((v) => v.status === "active");
  const receiveAddress = activeVaults[0]?.address;

  // Fee payer address for airdrops
  const feePayerAddress = feePayerSecret
    ? (() => {
        const { Keypair } = require("@solana/web3.js");
        return Keypair.fromSecretKey(Uint8Array.from(feePayerSecret)).publicKey.toBase58();
      })()
    : null;

  const copyAddress = useCallback((addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Receive SOL</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg transition">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {receiveAddress ? (
          <div className="space-y-4">
            {/* Vault Address */}
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Quantum-Safe Vault Address
              </label>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                <code className="text-sm text-emerald-400 font-mono break-all leading-relaxed">
                  {receiveAddress}
                </code>
                <button
                  onClick={() => copyAddress(receiveAddress)}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-zinc-700/50 hover:bg-zinc-700 text-white py-2 rounded-lg transition text-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Address
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-amber-400/80 font-medium mb-1">
                    Address changes after each transaction
                  </p>
                  <p className="text-xs text-zinc-500">
                    Quantum safety requires one-time keys. After you spend from this vault,
                    your receive address will change. Always use the latest address shown here.
                  </p>
                </div>
              </div>
            </div>

            {/* Fee Payer Info */}
            {feePayerAddress && (
              <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl px-4 py-3">
                <p className="text-xs text-zinc-500 mb-1">
                  Fee Payer Address (for devnet airdrops)
                </p>
                <code className="text-xs text-zinc-400 font-mono break-all">
                  {feePayerAddress}
                </code>
                <button
                  onClick={() => copyAddress(feePayerAddress)}
                  className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <Shield className="w-3.5 h-3.5" />
              <span>Protected by Winternitz one-time signatures</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-zinc-400 text-sm mb-2">No active vaults</p>
            <p className="text-zinc-600 text-xs">
              Open a vault first to receive SOL
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

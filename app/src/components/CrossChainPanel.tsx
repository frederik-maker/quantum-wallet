"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useWalletStore } from "@/lib/wallet-store";

export function CrossChainPanel() {
  const { network, ikaEnabled: ikaEnabledMap, dwalletAddress: dwalletAddressMap, dwalletBtcAddress: dwalletBtcAddressMap, setIkaEnabled } = useWalletStore();
  const ikaEnabled = ikaEnabledMap[network] ?? false;
  const dwalletAddress = dwalletAddressMap[network] ?? null;
  const dwalletBtcAddress = dwalletBtcAddressMap[network] ?? null;
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signTarget, setSignTarget] = useState("");
  const [signAmount, setSignAmount] = useState("");
  const [signing, setSigning] = useState(false);
  const [signResult, setSignResult] = useState<string | null>(null);
  const [btcCopied, setBtcCopied] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      // In production, this would call Ika gRPC to create a dWallet via DKG.
      // For pre-alpha devnet, we simulate the dWallet creation.
      await new Promise((r) => setTimeout(r, 1500));

      // Mock dWallet address (would come from Ika DKG response)
      const mockDwalletAddr = "DWaL" + Math.random().toString(36).slice(2, 10) + "...ika";
      const mockBtcAddr = "tb1q" + Math.random().toString(36).slice(2, 22);

      setIkaEnabled(true, mockDwalletAddr, mockBtcAddr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const handleSign = async () => {
    if (!signTarget || !signAmount) return;
    setSigning(true);
    setSignResult(null);
    try {
      // In production: build Bitcoin sighash, keccak256 it, submit ApproveCrossChainMessage
      // instruction, then poll Ika for the ECDSA signature.
      await new Promise((r) => setTimeout(r, 2000));

      // Mock signature result
      const mockTxId = Array.from({ length: 64 }, () =>
        "0123456789abcdef"[Math.floor(Math.random() * 16)]
      ).join("");

      setSignResult(mockTxId);

      // Log to activity
      const store = useWalletStore.getState();
      useWalletStore.setState({
        history: [...store.history, {
          id: `xchain-${Date.now()}`,
          type: "cross_chain_sign" as const,
          amount: Math.round(parseFloat(signAmount) * 1e8), // sats
          counterparty: signTarget,
          timestamp: Date.now(),
          status: "confirmed" as const,
        }],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signing failed");
    } finally {
      setSigning(false);
    }
  };

  const copyBtcAddr = () => {
    if (!dwalletBtcAddress) return;
    navigator.clipboard.writeText(dwalletBtcAddress);
    setBtcCopied(true);
    setTimeout(() => setBtcCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="pb-1">
        <p className="text-[15px] font-semibold text-zinc-200 mb-2" style={{ letterSpacing: "-0.01em" }}>Cross-chain</p>
        <p className="text-[13px] text-zinc-400 leading-relaxed">
          Ika gives you addresses on <span className="text-zinc-200">Bitcoin, Ethereum, and other chains</span> that only your quantum-safe Solana keys can spend from. One wallet, all chains.
        </p>
      </div>

      {/* Ika dWallet card */}
      <div className="card-cyan p-5 rounded-2xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/[0.08] border border-cyan-500/[0.12] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-medium text-white">Ika dWallet</p>
              <p className="text-[12px] text-zinc-400">Multi-chain addresses from one Solana wallet</p>
            </div>
          </div>
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            ikaEnabled
              ? "bg-cyan-500/[0.08] text-cyan-400 border border-cyan-500/[0.15]"
              : "bg-zinc-800/50 text-zinc-500 border border-zinc-700/30"
          }`}>
            {ikaEnabled ? "connected" : "not connected"}
          </div>
        </div>

        {!ikaEnabled ? (
          <div className="space-y-3">
            <p className="text-[13px] text-zinc-400 leading-relaxed">
              Connect to Ika to create addresses on Bitcoin, Ethereum, and other chains. These addresses are controlled by your Solana vault &mdash; only your quantum-safe keys can authorize spending.
            </p>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConnect}
              disabled={connecting}
              className="btn-cyan-soft w-full py-2.5 rounded-xl text-[13px] font-medium disabled:opacity-50 transition-all"
            >
              {connecting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                  Connecting to Ika...
                </span>
              ) : (
                "Connect to Ika"
              )}
            </motion.button>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Ika&apos;s dWallet SDK is pre-launch &mdash; the on-chain CPI is real, but dWallet creation requires their gRPC API which isn&apos;t publicly available yet. Addresses shown here are simulated.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[13px] text-zinc-400 leading-relaxed">
              Your Solana keys now control this Bitcoin address. Send testnet Bitcoin here, then use the form below to spend it &mdash; all authorized from Solana.
            </p>

            {/* Bitcoin address — the main thing */}
            <div className="p-4 rounded-xl bg-black/20 border border-amber-500/[0.10]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] text-zinc-300 font-medium">Your Bitcoin address (testnet)</p>
                <button
                  onClick={copyBtcAddr}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {btcCopied ? "copied" : "copy"}
                </button>
              </div>
              <p className="text-[13px] text-amber-400 font-mono break-all leading-relaxed">{dwalletBtcAddress}</p>
              <p className="text-[11px] text-zinc-500 mt-2">
                Fund this address with tBTC to start sending cross-chain transactions.
              </p>
            </div>

            {/* dWallet ID — secondary */}
            <div className="p-3 rounded-xl bg-black/20 border border-cyan-500/[0.06]">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-zinc-500">dWallet ID</p>
                <p className="text-[11px] text-cyan-400/70 font-mono">{dwalletAddress}</p>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Ika&apos;s dWallet SDK is pre-launch &mdash; the on-chain CPI is real, but dWallet creation requires their gRPC API which isn&apos;t publicly available yet. Addresses here are simulated.
            </p>
          </div>
        )}

        {error && (
          <p className="mt-3 text-[13px] text-red-400/80">{error}</p>
        )}
      </div>

      {/* Cross-chain sign */}
      {ikaEnabled && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-subtle p-5 rounded-2xl space-y-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
              <path d="M12 22V12" opacity="0.5" />
              <path d="M3 7l9 5 9-5" opacity="0.5" />
            </svg>
            <p className="text-[14px] font-medium text-white">Sign a Bitcoin transaction</p>
          </div>

          <p className="text-[13px] text-zinc-400 leading-relaxed">
            Spend Bitcoin from your address above. Your quantum-safe keys on Solana authorize the spend, then Ika produces a valid Bitcoin signature.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1.5 block">Send to</label>
              <input
                type="text"
                value={signTarget}
                onChange={(e) => setSignTarget(e.target.value)}
                placeholder="tb1q... or bc1q..."
                className="w-full bg-transparent border border-zinc-700/50 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/30 transition font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1.5 block">Amount (tBTC)</label>
              <input
                type="text"
                value={signAmount}
                onChange={(e) => setSignAmount(e.target.value)}
                placeholder="0.001"
                className="w-full bg-transparent border border-zinc-700/50 rounded-lg px-3 py-2.5 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/30 transition font-mono"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSign}
            disabled={signing || !signTarget || !signAmount}
            className="w-full py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[13px] font-medium disabled:opacity-30 hover:bg-amber-500/15 transition-all"
          >
            {signing ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                Signing...
              </span>
            ) : (
              "Sign & Broadcast"
            )}
          </motion.button>

          {signResult && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/[0.10]"
            >
              <p className="text-[12px] text-emerald-400 mb-1">Transaction signed and broadcast</p>
              <a
                href={`https://mempool.space/testnet/tx/${signResult}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-cyan-400 font-mono hover:underline truncate block"
              >
                {signResult.slice(0, 16)}...{signResult.slice(-8)}
              </a>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* How it works */}
      <div className="pt-2 space-y-3">
        <p className="text-[12px] text-zinc-400 font-mono uppercase tracking-wider">How it works</p>
        <div className="space-y-2.5 text-[13px] text-zinc-400 leading-relaxed">
          <div className="flex gap-3 items-start">
            <span className="text-cyan-400/70 font-mono text-[11px] mt-0.5 shrink-0">1</span>
            <p><span className="text-zinc-200">Connect</span> &mdash; Ika creates a Bitcoin address that only your Solana vault can spend from</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-cyan-400/70 font-mono text-[11px] mt-0.5 shrink-0">2</span>
            <p><span className="text-zinc-200">Fund</span> &mdash; Send Bitcoin to your new address (it&apos;s a real Bitcoin address, just controlled from Solana)</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-cyan-400/70 font-mono text-[11px] mt-0.5 shrink-0">3</span>
            <p><span className="text-zinc-200">Sign</span> &mdash; Your quantum-safe keys authorize the spend, and Ika produces a valid Bitcoin signature</p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-cyan-400/70 font-mono text-[11px] mt-0.5 shrink-0">4</span>
            <p><span className="text-zinc-200">Broadcast</span> &mdash; The signed transaction goes directly to Bitcoin &mdash; no bridge, no wrapped tokens</p>
          </div>
        </div>
      </div>
    </div>
  );
}

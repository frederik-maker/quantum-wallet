"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWalletStore } from "@/lib/wallet-store";

export function PrivacyPanel() {
  const { network } = useWalletStore();
  const [umbraStatus, setUmbraStatus] = useState<"idle" | "registering" | "registered" | "error">("idle");
  const [magicblockAvailable, setMagicblockAvailable] = useState<boolean | null>(null);

  const handleUmbraRegister = async () => {
    setUmbraStatus("registering");
    try {
      // Dynamic import to avoid SSR issues
      const { registerUmbraUser } = await import("@/lib/umbra");
      const { feePayerSecret } = useWalletStore.getState();
      if (!feePayerSecret) throw new Error("No wallet");

      const { Keypair } = await import("@solana/web3.js");
      const signer = Keypair.fromSecretKey(Uint8Array.from(feePayerSecret));

      await registerUmbraUser({
        network: network === "mainnet-beta" ? "mainnet" : "devnet",
        rpcUrl: network === "mainnet-beta"
          ? "https://api.mainnet-beta.solana.com"
          : "https://api.devnet.solana.com",
        signer,
      });
      setUmbraStatus("registered");
    } catch (err) {
      console.error("Umbra registration failed:", err);
      setUmbraStatus("error");
    }
  };

  const checkMagicBlock = async () => {
    try {
      const { checkMagicBlockAvailability } = await import("@/lib/magicblock");
      const available = await checkMagicBlockAvailability(
        network as "devnet" | "mainnet-beta"
      );
      setMagicblockAvailable(available);
    } catch {
      setMagicblockAvailable(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="space-y-4 pb-4">
        {/* Umbra Privacy */}
        <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-white">Umbra Privacy</p>
              <p className="text-xs text-zinc-600">Confidential transfers via encrypted UTXO</p>
            </div>
            <StatusDot status={umbraStatus === "registered" ? "active" : umbraStatus === "registering" ? "loading" : "inactive"} />
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-700 mb-3">
            <span className="px-2 py-0.5 rounded bg-white/[0.04] font-mono">quantum-safe</span>
            <span>+</span>
            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono">private</span>
          </div>

          {umbraStatus === "idle" && (
            <button
              onClick={handleUmbraRegister}
              className="w-full py-2.5 rounded-lg border border-purple-500/20 text-purple-400 text-sm font-medium hover:bg-purple-500/5 transition"
            >
              Enable Privacy Layer
            </button>
          )}
          {umbraStatus === "registering" && (
            <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-zinc-500">
              <span className="w-3 h-3 border border-zinc-600 border-t-purple-400 rounded-full animate-spin" />
              Registering with Umbra...
            </div>
          )}
          {umbraStatus === "registered" && (
            <p className="text-xs text-[#00e5a0] py-2">Privacy layer active. Use &quot;Private Send&quot; for shielded transfers.</p>
          )}
          {umbraStatus === "error" && (
            <div>
              <p className="text-xs text-red-400/70 py-1 mb-2">Registration failed. Ensure wallet is funded.</p>
              <button
                onClick={handleUmbraRegister}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* MagicBlock */}
        <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-white">MagicBlock Rollups</p>
              <p className="text-xs text-zinc-600">Ephemeral execution for fast vault ops</p>
            </div>
            <StatusDot status={magicblockAvailable === true ? "active" : magicblockAvailable === false ? "inactive" : "unknown"} />
          </div>

          <div className="text-xs text-zinc-700 space-y-1 mb-3">
            <p>10-50ms latency for vault rotation</p>
            <p>Batch pre-initialize multiple vaults</p>
            <p>Private execution environment</p>
          </div>

          {magicblockAvailable === null && (
            <button
              onClick={checkMagicBlock}
              className="w-full py-2.5 rounded-lg border border-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/5 transition"
            >
              Check Availability
            </button>
          )}
          {magicblockAvailable === true && (
            <p className="text-xs text-[#00e5a0] py-2">MagicBlock router connected. Vault ops will use ephemeral rollup.</p>
          )}
          {magicblockAvailable === false && (
            <p className="text-xs text-zinc-600 py-2">Router not available on {network}. Using standard Solana RPC.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatusDot({ status }: { status: "active" | "inactive" | "loading" | "unknown" }) {
  return (
    <div className={`w-2 h-2 rounded-full ${
      status === "active" ? "bg-[#00e5a0] glow-dot" :
      status === "loading" ? "bg-amber-400 animate-pulse" :
      status === "inactive" ? "bg-red-400/50" :
      "bg-zinc-700"
    }`} />
  );
}

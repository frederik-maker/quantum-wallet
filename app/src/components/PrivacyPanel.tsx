"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useWalletStore } from "@/lib/wallet-store";

export function PrivacyPanel() {
  const { network, rpcUrl, feePayerSecret, umbraRegistered, magicblockEnabled, setUmbraRegistered, setMagicblockEnabled } = useWalletStore();
  const [umbraRegistering, setUmbraRegistering] = useState(false);
  const [umbraError, setUmbraError] = useState<string | null>(null);
  const [magicblockChecking, setMagicblockChecking] = useState(false);
  const [magicblockError, setMagicblockError] = useState<string | null>(null);

  const handleUmbraRegister = async () => {
    setUmbraRegistering(true);
    setUmbraError(null);
    try {
      const { registerUmbraUser } = await import("@/lib/umbra");
      if (!feePayerSecret) throw new Error("No wallet");
      await registerUmbraUser({ network: network === "mainnet-beta" ? "mainnet" : "devnet", rpcUrl, feePayerSecret });
      setUmbraRegistered(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      if (msg.toLowerCase().includes("simulation")) {
        setUmbraError("Transaction failed — your wallet may need SOL for fees.");
      } else {
        setUmbraError(msg);
      }
    } finally {
      setUmbraRegistering(false);
    }
  };

  const checkMagicBlock = async () => {
    setMagicblockChecking(true);
    setMagicblockError(null);
    try {
      const { checkMagicBlockAvailability } = await import("@/lib/magicblock");
      const available = await checkMagicBlockAvailability(network as "devnet" | "mainnet-beta");
      setMagicblockEnabled(available);
      if (!available) {
        setMagicblockError("Could not connect to MagicBlock router.");
      }
    } catch (err) {
      setMagicblockEnabled(false);
      setMagicblockError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setMagicblockChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="pb-1">
        <p className="text-[15px] font-semibold text-zinc-200 mb-2" style={{ letterSpacing: "-0.01em" }}>Privacy</p>
        <p className="text-[13px] text-zinc-400 leading-relaxed">
          Your keys are quantum-safe. These features hide <span className="text-zinc-200">who you transact with</span> and <span className="text-zinc-200">how much you send</span>.
        </p>
      </div>

      {/* Umbra */}
      <div className="card-privacy p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/[0.06] border border-violet-500/[0.10] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            </div>
            <div>
              <p className="text-[14px] font-medium text-white">Umbra Privacy</p>
              <p className="text-[12px] text-zinc-400">Hide sender and amount on-chain</p>
            </div>
          </div>
          <StatusPill active={umbraRegistered} loading={umbraRegistering} />
        </div>

        <p className="text-[13px] text-zinc-400 leading-relaxed mb-4">
          Encrypts your transfers so nobody on-chain can see who sent what or how much. Both sender and recipient need to register once.
        </p>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.04]">quantum-safe</span>
          <span className="text-zinc-500 text-[11px]">+</span>
          <span className="text-[11px] font-mono text-violet-400/80 px-2 py-0.5 rounded bg-violet-500/[0.04] border border-violet-500/[0.06]">private</span>
        </div>

        {umbraRegistered ? (
          <div className="flex items-center gap-2 text-[13px] text-[#00e5a0]/80">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
            Active &mdash; toggle &quot;Private send&quot; when sending.
          </div>
        ) : umbraRegistering ? (
          <div className="flex items-center justify-center gap-2 py-2.5 text-[13px] text-zinc-400">
            <span className="w-3.5 h-3.5 border-2 border-zinc-700 border-t-violet-400 rounded-full animate-spin" /> Registering...
          </div>
        ) : umbraError ? (
          <div>
            <p className="text-[12px] text-red-400/70 mb-1.5">{umbraError}</p>
            <button onClick={handleUmbraRegister} className="text-[12px] text-zinc-400 hover:text-zinc-200 transition">Retry &rarr;</button>
          </div>
        ) : (
          <motion.button onClick={handleUmbraRegister} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            className="btn-purple-soft w-full py-2.5 rounded-xl text-[13px] font-medium"
          >Register for private transfers</motion.button>
        )}
      </div>

      {/* MagicBlock */}
      <div className="card-cyan p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/[0.10] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            </div>
            <div>
              <p className="text-[14px] font-medium text-white">MagicBlock Rollups</p>
              <p className="text-[12px] text-zinc-400">Faster key rotation for your vault</p>
            </div>
          </div>
          <StatusPill active={magicblockEnabled} />
        </div>

        <p className="text-[13px] text-zinc-400 leading-relaxed mb-4">
          Routes vault operations through a fast execution layer. Key rotation drops from ~400ms to 10&ndash;50ms &mdash; transactions feel instant.
        </p>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-mono text-cyan-400/80 px-2 py-0.5 rounded bg-cyan-500/[0.04] border border-cyan-500/[0.06]">10-50ms</span>
          <span className="text-zinc-400 text-[11px]">vs</span>
          <span className="text-[11px] font-mono text-zinc-500 px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.04] line-through">~400ms</span>
        </div>

        {magicblockEnabled ? (
          <div className="flex items-center gap-2 text-[13px] text-[#00e5a0]/80">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
            Connected &mdash; vault operations use the fast lane.
          </div>
        ) : magicblockChecking ? (
          <div className="flex items-center justify-center gap-2 py-2.5 text-[13px] text-zinc-400">
            <span className="w-3.5 h-3.5 border-2 border-zinc-700 border-t-cyan-400 rounded-full animate-spin" /> Checking...
          </div>
        ) : magicblockError ? (
          <div>
            <p className="text-[12px] text-red-400/70 mb-1.5">{magicblockError}</p>
            <button onClick={() => { setMagicblockError(null); checkMagicBlock(); }} className="text-[12px] text-zinc-400 hover:text-zinc-200 transition">Retry &rarr;</button>
          </div>
        ) : (
          <motion.button onClick={checkMagicBlock} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            className="btn-cyan-soft w-full py-2.5 rounded-xl text-[13px] font-medium"
          >Check availability</motion.button>
        )}
      </div>
    </div>
  );
}

function StatusPill({ active, loading }: { active: boolean; loading?: boolean }) {
  if (loading) {
    return <span className="text-[9px] font-mono text-amber-400/50 px-2 py-0.5 rounded-full bg-amber-400/[0.04] border border-amber-400/[0.06]">loading</span>;
  }
  if (active) {
    return (
      <span className="flex items-center gap-1.5 text-[9px] font-mono text-[#00e5a0]/60 px-2 py-0.5 rounded-full bg-[#00e5a0]/[0.04] border border-[#00e5a0]/[0.06]">
        <span className="w-1 h-1 rounded-full bg-[#00e5a0]" /> active
      </span>
    );
  }
  return <span className="text-[9px] font-mono text-zinc-500 px-2 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.04]">inactive</span>;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useWalletStore } from "@/lib/wallet-store";
import { LAMPORTS_PER_SOL } from "@/lib/constants";

export function PrivacyPanel() {
  const { network, rpcUrl, feePayerSecret, umbraRegistered: umbraRegisteredMap, magicblockEnabled: magicblockEnabledMap, setUmbraRegistered, setMagicblockEnabled } = useWalletStore();
  const umbraRegistered = umbraRegisteredMap[network] ?? false;
  const magicblockEnabled = magicblockEnabledMap[network] ?? false;
  const networkLabel = network === "mainnet-beta" ? "mainnet" : network;
  const [umbraRegistering, setUmbraRegistering] = useState(false);
  const [umbraError, setUmbraError] = useState<string | null>(null);
  const [magicblockChecking, setMagicblockChecking] = useState(false);
  const [magicblockError, setMagicblockError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [pending, setPending] = useState<readonly unknown[] | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [encryptedLamports, setEncryptedLamports] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const refreshEncryptedBalance = useCallback(async () => {
    if (!feePayerSecret || !umbraRegistered) return;
    setBalanceLoading(true);
    try {
      const { queryEncryptedSolBalance } = await import("@/lib/umbra");
      const lamports = await queryEncryptedSolBalance({
        network: network === "mainnet-beta" ? "mainnet" : "devnet",
        rpcUrl,
        feePayerSecret,
      });
      setEncryptedLamports(lamports);
    } catch {
      // silent — encrypted balance is best-effort
    } finally {
      setBalanceLoading(false);
    }
  // intentionally don't depend on umbraRegistered to avoid spurious calls during login flow
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feePayerSecret, network, rpcUrl]);

  // Refresh when activating or switching networks
  useEffect(() => {
    if (umbraRegistered) refreshEncryptedBalance();
    else setEncryptedLamports(null);
  }, [umbraRegistered, network, refreshEncryptedBalance]);

  // Keep receiver and self UTXOs separate so we can route each to its own claimer.
  const [pendingReceiver, setPendingReceiver] = useState<readonly unknown[]>([]);
  const [pendingSelf, setPendingSelf] = useState<readonly unknown[]>([]);

  const handleScan = async () => {
    setScanning(true);
    setScanError(null);
    setClaimStatus(null);
    try {
      const { scanForTransfers } = await import("@/lib/umbra");
      const res = await scanForTransfers({
        network: network === "mainnet-beta" ? "mainnet" : "devnet",
        rpcUrl,
        feePayerSecret: feePayerSecret!,
      });
      const receiver = [...res.publicReceived, ...res.received];
      const self = [...res.publicSelfBurnable, ...res.selfBurnable];
      setPendingReceiver(receiver);
      setPendingSelf(self);
      const total = receiver.length + self.length;
      setPending(total > 0 ? new Array(total) : []);
      if (total === 0) {
        setClaimStatus("No pending private transfers.");
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const handleClaim = async () => {
    const total = pendingReceiver.length + pendingSelf.length;
    if (total === 0) return;
    setClaiming(true);
    setScanError(null);
    try {
      const { claimReceivedUtxos, claimSelfUtxos } = await import("@/lib/umbra");
      const cfg = {
        network: (network === "mainnet-beta" ? "mainnet" : "devnet") as "mainnet" | "devnet",
        rpcUrl,
        feePayerSecret: feePayerSecret!,
      };
      let claimed = 0;
      let failed = 0;
      const reasons: string[] = [];
      if (pendingReceiver.length > 0) {
        const r = await claimReceivedUtxos(cfg, pendingReceiver);
        claimed += r.claimed;
        failed += r.failedBatches;
        if (r.reasons) reasons.push(...r.reasons);
      }
      if (pendingSelf.length > 0) {
        const r = await claimSelfUtxos(cfg, pendingSelf);
        claimed += r.claimed;
        failed += r.failedBatches;
        if (r.reasons) reasons.push(...r.reasons);
      }
      const parts: string[] = [];
      if (claimed > 0) parts.push(`Claimed ${claimed} private transfer${claimed !== 1 ? "s" : ""}`);
      if (failed > 0) parts.push(`${failed} batch${failed !== 1 ? "es" : ""} failed${reasons.length ? ` (${reasons[0]})` : ""}`);
      setClaimStatus(parts.length ? parts.join(" · ") : "Claim submitted");
      // Log to activity as a receive
      useWalletStore.setState((s) => ({
        history: [
          ...s.history,
          {
            id: `umbra-claim-${Date.now()}`,
            type: "receive" as const,
            amount: 0,
            counterparty: "Umbra mixer",
            timestamp: Date.now(),
            status: "confirmed" as const,
          },
        ],
      }));
      setPending([]);
      setPendingReceiver([]);
      setPendingSelf([]);
      // Claim lands funds in the encrypted balance — refresh to reflect
      refreshEncryptedBalance();
      // Re-scan after a short delay so the UI reflects post-claim indexer state
      // (otherwise stale scanner data keeps showing the same UTXOs as pending).
      setTimeout(() => {
        handleScan();
      }, 3000);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  };

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
      const lower = msg.toLowerCase();
      // Blockhash expired (`__code=1` with currentBlockHeight > lastValidBlockHeight) —
      // the proof + tx build took longer than a blockhash's ~60s validity window.
      // Retrying almost always fixes it because the SDK grabs a fresh blockhash on the next attempt.
      if (
        lower.includes("blockhash") ||
        lower.includes("blockheightexceeded") ||
        (lower.includes("__code=1") && lower.includes("lastvalidblockheight"))
      ) {
        setUmbraError("Blockhash expired before the tx landed — ZK proof generation took too long. Click retry, it usually works second time.");
      } else if (lower.includes("simulation")) {
        setUmbraError("Transaction failed — your wallet may need SOL for fees.");
      } else if (lower.includes("429") || lower.includes("too many")) {
        setUmbraError("RPC rate limited. Wait a few seconds and retry.");
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
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[13px] text-[#00e5a0]/80">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
              Active &mdash; toggle &quot;Private send&quot; when sending.
            </div>
            <p className="text-[12px] text-zinc-500 leading-relaxed">
              Recipients also need to be registered with Umbra on {networkLabel} to receive private transfers.
            </p>
            <button
              onClick={handleUmbraRegister}
              disabled={umbraRegistering}
              className="text-[12px] text-zinc-400 hover:text-violet-300 transition disabled:opacity-40"
            >
              {umbraRegistering ? "Re-registering…" : "Re-register (if sends fail) →"}
            </button>
            {umbraError && (
              <p className="text-[12px] text-red-400/70">{umbraError}</p>
            )}

            {/* Encrypted balance */}
            <div className="pt-3 mt-3 border-t border-white/[0.04]">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[12px] text-zinc-400 font-medium">Encrypted balance</p>
                <button
                  onClick={refreshEncryptedBalance}
                  disabled={balanceLoading}
                  className="text-[11px] text-zinc-500 hover:text-violet-300 transition disabled:opacity-40"
                  title="Refresh encrypted balance"
                >
                  {balanceLoading ? "refreshing…" : "refresh"}
                </button>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[22px] font-light text-white tabular-nums tracking-tight">
                  {encryptedLamports === null
                    ? "—"
                    : (encryptedLamports / LAMPORTS_PER_SOL).toFixed(4)}
                </span>
                <span className="text-[12px] text-zinc-500 font-mono">SOL</span>
                <span className="text-[11px] text-violet-400/60 font-mono ml-1.5 px-1.5 py-0.5 rounded bg-violet-500/[0.06] border border-violet-500/[0.08]">shielded</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed mt-1.5">
                Balance held in your Umbra encrypted account — invisible on Solana&apos;s public ledger. Funds land here after you claim incoming transfers.
              </p>
            </div>

            {/* Incoming private transfers — scan + claim */}
            <div className="pt-3 mt-3 border-t border-white/[0.04] space-y-2">
              <p className="text-[12px] text-zinc-400 font-medium">Incoming private transfers</p>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Private sends land as encrypted UTXOs in Umbra&apos;s mixer pool. Scan to find transfers addressed to you, then claim them into your encrypted balance.
              </p>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={handleScan}
                  disabled={scanning || claiming || !feePayerSecret}
                  whileHover={!scanning && !claiming ? { scale: 1.01 } : {}}
                  whileTap={!scanning && !claiming ? { scale: 0.98 } : {}}
                  className="flex-1 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[12px] text-zinc-300 hover:bg-white/[0.05] transition disabled:opacity-40"
                >
                  {scanning ? "Scanning…" : "Check for incoming"}
                </motion.button>
                {pending && pending.length > 0 && (
                  <motion.button
                    onClick={handleClaim}
                    disabled={claiming || scanning}
                    whileHover={!claiming ? { scale: 1.01 } : {}}
                    whileTap={!claiming ? { scale: 0.98 } : {}}
                    className="flex-1 py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-[12px] text-violet-200 hover:bg-violet-500/30 transition disabled:opacity-40"
                  >
                    {claiming ? "Claiming…" : `Claim ${pending.length}`}
                  </motion.button>
                )}
              </div>
              {claimStatus && (
                <p className="text-[12px] text-[#00e5a0]/80">{claimStatus}</p>
              )}
              {scanError && (
                <p className="text-[12px] text-red-400/70">{scanError}</p>
              )}
            </div>
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
          >Register for private transfers on {networkLabel}</motion.button>
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
    return <span className="text-[9px] font-mono text-amber-400/50 px-2 py-0.5 rounded-full bg-amber-400/[0.04] border border-amber-400/[0.06] whitespace-nowrap shrink-0">loading</span>;
  }
  if (active) {
    return (
      <span className="flex items-center gap-1.5 text-[9px] font-mono text-[#00e5a0]/60 px-2 py-0.5 rounded-full bg-[#00e5a0]/[0.04] border border-[#00e5a0]/[0.06] whitespace-nowrap shrink-0">
        <span className="w-1 h-1 rounded-full bg-[#00e5a0]" /> active
      </span>
    );
  }
  return <span className="text-[9px] font-mono text-zinc-500 px-2 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.04] whitespace-nowrap shrink-0">inactive</span>;
}

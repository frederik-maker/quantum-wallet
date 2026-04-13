"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Send,
  Download,
  RefreshCw,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ChevronDown,
  Wallet,
  Shield,
  ExternalLink,
  Droplets,
  Loader2,
  Zap,
} from "lucide-react";
import { useWalletStore, TxHistoryEntry } from "@/lib/wallet-store";
import { QuantumShield } from "./QuantumShield";
import { SendModal } from "./SendModal";
import { ReceiveModal } from "./ReceiveModal";
import { MigrateModal } from "./MigrateModal";
import { VaultPanel } from "./VaultPanel";
import { LAMPORTS_PER_SOL } from "@/lib/constants";

export function WalletDashboard() {
  const {
    walletName,
    totalBalance,
    vaults,
    history,
    network,
    loading,
    error,
    refreshBalances,
    setNetwork,
    feePayerSecret,
    resetWallet,
    airdrop,
    fundVault,
  } = useWalletStore();

  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showMigrate, setShowMigrate] = useState(false);
  const [showVaults, setShowVaults] = useState(false);
  const [copied, setCopied] = useState(false);
  const [airdropping, setAirdropping] = useState(false);
  const [funding, setFunding] = useState(false);

  const activeVaults = vaults.filter((v) => v.status === "active");
  const solBalance = totalBalance / LAMPORTS_PER_SOL;

  useEffect(() => {
    refreshBalances();
    const interval = setInterval(refreshBalances, 15000);
    return () => clearInterval(interval);
  }, [refreshBalances]);

  const receiveAddress = activeVaults[0]?.address;

  const copyAddress = useCallback(() => {
    if (receiveAddress) {
      navigator.clipboard.writeText(receiveAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [receiveAddress]);

  const recentHistory = history.slice().reverse().slice(0, 10);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">{walletName}</h1>
              <span className="text-xs text-zinc-500">{network}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <QuantumShield
              status={loading ? "rotating" : activeVaults.length > 0 ? "protected" : "vulnerable"}
            />
            <button
              onClick={() => refreshBalances()}
              className="p-2 rounded-lg hover:bg-zinc-800 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-zinc-400 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="text-sm text-zinc-400 mb-1">Total Balance</div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-bold text-white">
              {solBalance.toFixed(4)}
            </span>
            <span className="text-lg text-zinc-500">SOL</span>
          </div>
          <div className="text-sm text-zinc-500">
            Across {activeVaults.length} active vault{activeVaults.length !== 1 ? "s" : ""}
          </div>

          {/* Receive Address Preview */}
          {receiveAddress && (
            <div className="mt-4 flex items-center gap-2">
              <code className="text-xs text-zinc-500 font-mono truncate flex-1">
                {receiveAddress}
              </code>
              <button
                onClick={copyAddress}
                className="p-1.5 rounded-lg hover:bg-zinc-800 transition shrink-0"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setShowSend(true)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-zinc-800/50 hover:border-zinc-700 transition group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition">
              <Send className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm font-medium text-white">Send</span>
          </button>
          <button
            onClick={() => setShowReceive(true)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-zinc-800/50 hover:border-zinc-700 transition group"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition">
              <Download className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-white">Receive</span>
          </button>
          <button
            onClick={() => setShowMigrate(true)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-zinc-800/50 hover:border-zinc-700 transition group"
          >
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition">
              <Wallet className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-sm font-medium text-white">Migrate</span>
          </button>
        </div>

        {/* Devnet Quick Start */}
        {network === "devnet" && totalBalance === 0 && (
          <div className="bg-gradient-to-r from-cyan-500/5 to-emerald-500/5 border border-cyan-500/10 rounded-xl p-4">
            <p className="text-sm font-medium text-white mb-1">Get Started on Devnet</p>
            <p className="text-xs text-zinc-500 mb-3">
              Airdrop test SOL, then fund your quantum vault.
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setAirdropping(true);
                  try {
                    await airdrop();
                  } catch (e) {
                    console.error(e);
                  }
                  setAirdropping(false);
                }}
                disabled={airdropping}
                className="flex-1 flex items-center justify-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 py-2 rounded-lg text-sm font-medium hover:bg-cyan-500/20 transition disabled:opacity-50"
              >
                {airdropping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Droplets className="w-4 h-4" />
                )}
                Airdrop 2 SOL
              </button>
              <button
                onClick={async () => {
                  setFunding(true);
                  try {
                    await fundVault();
                  } catch (e) {
                    console.error(e);
                  }
                  setFunding(false);
                }}
                disabled={funding}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-2 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition disabled:opacity-50"
              >
                {funding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Fund Vault
              </button>
            </div>
          </div>
        )}

        {/* Vault Status */}
        <button
          onClick={() => setShowVaults(!showVaults)}
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between hover:bg-zinc-800/30 transition"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-zinc-300">
              {activeVaults.length} Quantum Vault{activeVaults.length !== 1 ? "s" : ""} Active
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-zinc-500 transition ${showVaults ? "rotate-180" : ""}`}
          />
        </button>

        {showVaults && <VaultPanel />}

        {/* Transaction History */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 mb-3 px-1">
            Recent Activity
          </h2>
          {recentHistory.length === 0 ? (
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-8 text-center">
              <Clock className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm">No transactions yet</p>
              <p className="text-zinc-600 text-xs mt-1">
                Fund your wallet to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentHistory.map((tx) => (
                <TxHistoryRow key={tx.id} tx={tx} network={network} />
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value as "devnet" | "mainnet-beta" | "testnet")}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none"
          >
            <option value="devnet">Devnet</option>
            <option value="testnet">Testnet</option>
            <option value="mainnet-beta">Mainnet</option>
          </select>
          <button
            onClick={resetWallet}
            className="text-xs text-zinc-600 hover:text-red-400 transition"
          >
            Reset Wallet
          </button>
        </div>
      </main>

      {/* Modals */}
      {showSend && <SendModal onClose={() => setShowSend(false)} />}
      {showReceive && <ReceiveModal onClose={() => setShowReceive(false)} />}
      {showMigrate && <MigrateModal onClose={() => setShowMigrate(false)} />}
    </div>
  );
}

function TxHistoryRow({
  tx,
  network,
}: {
  tx: TxHistoryEntry;
  network: string;
}) {
  const isSend = tx.type === "send";
  const isMigrate = tx.type === "migrate";
  const amount = tx.amount / LAMPORTS_PER_SOL;
  const explorerBase =
    network === "mainnet-beta"
      ? "https://explorer.solana.com"
      : `https://explorer.solana.com/?cluster=${network}`;

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl px-4 py-3 flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isSend
            ? "bg-blue-500/10"
            : isMigrate
            ? "bg-purple-500/10"
            : "bg-emerald-500/10"
        }`}
      >
        {isSend ? (
          <ArrowUpRight className="w-4 h-4 text-blue-400" />
        ) : isMigrate ? (
          <Wallet className="w-4 h-4 text-purple-400" />
        ) : (
          <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white capitalize">
            {tx.type}
          </span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              tx.status === "confirmed"
                ? "bg-emerald-500/10 text-emerald-400"
                : tx.status === "failed"
                ? "bg-red-500/10 text-red-400"
                : "bg-amber-500/10 text-amber-400"
            }`}
          >
            {tx.status}
          </span>
        </div>
        {tx.counterparty && (
          <p className="text-xs text-zinc-500 font-mono truncate">
            {tx.counterparty}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className={`text-sm font-medium ${isSend ? "text-blue-400" : "text-emerald-400"}`}>
          {isSend ? "-" : "+"}{amount.toFixed(4)} SOL
        </div>
        <div className="text-xs text-zinc-600">
          {new Date(tx.timestamp).toLocaleTimeString()}
        </div>
      </div>
      {tx.signature && (
        <a
          href={`${explorerBase}/tx/${tx.signature}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 hover:bg-zinc-800 rounded transition shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5 text-zinc-600" />
        </a>
      )}
    </div>
  );
}

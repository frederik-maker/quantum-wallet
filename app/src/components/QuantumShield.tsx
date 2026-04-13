"use client";

interface QuantumShieldProps {
  status: "protected" | "rotating" | "vulnerable";
}

export function QuantumShield({ status }: QuantumShieldProps) {
  if (status === "protected") {
    return (
      <div className="flex items-center gap-2">
        <div className="relative w-2 h-2 rounded-full bg-[#00e5a0] glow-dot" />
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Quantum Safe</span>
      </div>
    );
  }

  if (status === "rotating") {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Syncing</span>
      </div>
    );
  }

  // "vulnerable" = no vaults yet, just needs setup
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-zinc-600" />
      <span className="text-xs font-mono text-zinc-600 uppercase tracking-wider">No Vaults</span>
    </div>
  );
}

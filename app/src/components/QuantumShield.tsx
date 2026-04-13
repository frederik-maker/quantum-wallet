"use client";

interface QuantumShieldProps {
  status: "protected" | "rotating" | "vulnerable";
}

export function QuantumShield({ status }: QuantumShieldProps) {
  if (status === "protected") {
    return (
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-[#00e5a0] status-alive" />
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#00e5a0] glow-dot" />
        </div>
        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-[0.15em]">
          Quantum Safe
        </span>
      </div>
    );
  }

  if (status === "rotating") {
    return (
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <div className="absolute inset-[-3px] rounded-full border border-amber-400/20 animate-spin" style={{ animationDuration: "3s" }} />
        </div>
        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-[0.15em]">
          Syncing
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="w-2 h-2 rounded-full bg-zinc-700" />
      <span className="text-[11px] font-mono text-zinc-600 uppercase tracking-[0.15em]">
        No Vaults
      </span>
    </div>
  );
}

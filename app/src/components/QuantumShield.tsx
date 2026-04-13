"use client";

interface QuantumShieldProps {
  status: "protected" | "rotating" | "vulnerable";
}

export function QuantumShield({ status }: QuantumShieldProps) {
  if (status === "protected") {
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-[#00e5a0] status-alive" />
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#00e5a0] glow-dot" />
        </div>
        <span className="text-[11px] font-medium text-[#00e5a0]/70">
          Protected
        </span>
      </div>
    );
  }

  if (status === "rotating") {
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <div className="absolute inset-[-3px] rounded-full border border-amber-400/20 animate-spin" style={{ animationDuration: "3s" }} />
        </div>
        <span className="text-[11px] font-medium text-amber-400/60">
          Syncing
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-zinc-600" />
      <span className="text-[11px] font-medium text-zinc-600">
        Not set up
      </span>
    </div>
  );
}

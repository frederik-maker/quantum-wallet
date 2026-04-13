"use client";

import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";

interface QuantumShieldProps {
  status: "protected" | "rotating" | "vulnerable";
  className?: string;
}

export function QuantumShield({ status, className = "" }: QuantumShieldProps) {
  const config = {
    protected: {
      icon: ShieldCheck,
      label: "Quantum Safe",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      pulse: false,
    },
    rotating: {
      icon: Shield,
      label: "Rotating Keys",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      pulse: true,
    },
    vulnerable: {
      icon: ShieldAlert,
      label: "Not Protected",
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      pulse: false,
    },
  };

  const { icon: Icon, label, color, bg, border, pulse } = config[status];

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${bg} ${border} ${className}`}
    >
      <Icon className={`w-4 h-4 ${color} ${pulse ? "animate-pulse" : ""}`} />
      <span className={`text-xs font-medium ${color}`}>{label}</span>
    </div>
  );
}

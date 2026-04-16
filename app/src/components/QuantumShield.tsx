"use client";

import { motion, AnimatePresence } from "framer-motion";

interface QuantumShieldProps {
  status: "protected" | "rotating" | "vulnerable";
}

/* ── Inline SVG icons (14x14) ── */

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M7 1L2.5 3.25V6.5C2.5 9.6 4.45 12.49 7 13.25C9.55 12.49 11.5 9.6 11.5 6.5V3.25L7 1Z"
        fill="currentColor"
        fillOpacity={0.12}
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Checkmark */}
      <path
        d="M5 7L6.5 8.5L9 5.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldBrokenIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M7 1L2.5 3.25V6.5C2.5 9.6 4.45 12.49 7 13.25C9.55 12.49 11.5 9.6 11.5 6.5V3.25L7 1Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 2"
      />
      {/* Slash through shield */}
      <path
        d="M4.5 9.5L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Animations ── */

const crossfade = {
  initial: { opacity: 0, filter: "blur(4px)" },
  animate: { opacity: 1, filter: "blur(0px)" },
  exit: { opacity: 0, filter: "blur(4px)" },
  transition: { duration: 0.25 },
};

/* ── Component ── */

export function QuantumShield({ status }: QuantumShieldProps) {
  return (
    <AnimatePresence mode="wait">
      {status === "protected" && (
        <motion.div
          key="protected"
          {...crossfade}
          className="status-badge-secure flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
        >
          <ShieldIcon className="text-[#00e5a0] shrink-0" />
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00e5a0] opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00e5a0]" />
          </span>
          <span className="text-[11px] font-semibold font-mono text-[#00e5a0] leading-none">
            secure
          </span>
        </motion.div>
      )}

      {status === "rotating" && (
        <motion.div
          key="rotating"
          {...crossfade}
          className="status-badge-amber flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
        >
          <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
          <span className="text-[11px] font-semibold font-mono text-amber-400 leading-none">
            syncing
          </span>
        </motion.div>
      )}

      {status === "vulnerable" && (
        <motion.div
          key="vulnerable"
          {...crossfade}
          className="status-badge-neutral flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
        >
          <ShieldBrokenIcon className="text-zinc-500 shrink-0" />
          <span className="text-[11px] font-medium font-mono text-zinc-500 leading-none">
            no vault
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

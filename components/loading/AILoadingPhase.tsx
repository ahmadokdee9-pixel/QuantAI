"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const PHASES = [
  "Gathering live listings…",
  "Matching your intent to what’s on the shelf…",
  "Balancing price, trust, and fit…",
  "Almost there—your tray is taking shape…",
] as const;

type Props = {
  className?: string;
  /** ms between phase changes */
  intervalMs?: number;
};

export default function AILoadingPhase({ className = "", intervalMs = 1500 }: Props) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => {
      setI((v) => (v + 1) % PHASES.length);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [reduce, intervalMs]);

  const label = reduce ? "Finding the best current offers for you…" : PHASES[i];

  return (
    <div
      className={`flex min-h-[2.75rem] items-center gap-3 rounded-2xl border border-cyan-400/16 bg-cyan-500/[0.06] px-4 py-3 backdrop-blur-md ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-400/35 opacity-50" />
        <span className="relative inline-flex size-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.55)]" />
      </span>
      <p className="cockpit-body text-[13px] font-medium tracking-tight text-cyan-50/92">{label}</p>
    </div>
  );
}

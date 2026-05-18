"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const STAGES = [
  { id: "intent", label: "Understanding the buying mission", sub: "Product identity, budget pressure, region, and intent" },
  { id: "offers", label: "Scanning live commerce routes", sub: "Trusted stores, marketplaces, and regional offer spread" },
  { id: "trust", label: "Checking seller and listing risk", sub: "Store trust, suspicious pricing, and weak-listing signals" },
  { id: "rank", label: "Building the decision tray", sub: "Value, timing, confidence, and safest next move" },
] as const;

type Props = {
  active: boolean;
  className?: string;
};

export default function SearchStreamRibbon({ active, className = "" }: Props) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const timers: number[] = [];

    const boot = () => {
      if (cancelled) return;
      if (reduce) {
        setStage(STAGES.length - 1);
        return;
      }
      setStage(0);
      const steps = [320, 460, 540, 660];
      let acc = 0;
      for (let i = 0; i < steps.length; i++) {
        acc += steps[i]!;
        timers.push(
          window.setTimeout(() => {
            if (!cancelled) setStage((s) => Math.min(STAGES.length - 1, s + 1));
          }, acc)
        );
      }
    };

    const raf = requestAnimationFrame(boot);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [active, reduce]);

  if (!active) return null;

  return (
    <div
      className={`stream-ribbon rounded-2xl border border-cyan-400/10 bg-gradient-to-br from-cyan-500/[0.05] via-[#0a1628]/94 to-violet-500/[0.04] p-4 backdrop-blur-lg ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium tracking-wide text-cyan-100/80">Working on your search</p>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium tabular-nums text-slate-400">
          {Math.min(stage + 1, STAGES.length)}/{STAGES.length}
        </span>
      </div>
      <div className="space-y-2.5">
        {STAGES.map((s, i) => {
          const done = i < stage;
          const current = i === stage;
          const pct = done ? 100 : current ? 78 + ((i * 4) % 14) : 14 + i * 10;
          return (
            <div key={s.id} className="flex gap-3">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/25 text-[10px] font-semibold text-slate-500">
                {done ? "✓" : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-h-[1.5rem] flex-wrap items-center justify-between gap-2">
                  <p
                    className={`text-[13px] font-semibold tracking-tight ${
                      current ? "text-cyan-50/95" : done ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {s.label}
                  </p>
                  {current && (
                    <motion.span
                      className="shrink-0 whitespace-nowrap text-[10px] font-medium text-cyan-200/75"
                      animate={reduce ? undefined : { opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      Active
                    </motion.span>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">{s.sub}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400/85 to-violet-500/80"
                    initial={false}
                    animate={{ width: `${Math.min(100, pct)}%` }}
                    transition={
                      reduce ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 30 }
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

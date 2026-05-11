"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const STAGES = [
  { id: "query", label: "Query understanding", sub: "Intent & constraints" },
  { id: "retail", label: "Global retailer scan", sub: "Listing fusion" },
  { id: "trust", label: "Trust synthesis", sub: "Store & deal signals" },
  { id: "final", label: "Final intelligence", sub: "QI field + tray ranking" },
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
      const steps = [520, 680, 740, 900];
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
      className={`stream-ribbon rounded-2xl border border-cyan-400/18 bg-gradient-to-br from-cyan-500/[0.09] via-[#0a1628]/90 to-violet-500/[0.06] p-4 backdrop-blur-lg ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="cockpit-label text-[10px] text-cyan-200/70">Live pipeline</p>
        <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-400">
          Stage {Math.min(stage + 1, STAGES.length)}/{STAGES.length}
        </span>
      </div>
      <div className="space-y-2.5">
        {STAGES.map((s, i) => {
          const done = i < stage;
          const current = i === stage;
          const pct = done ? 100 : current ? 72 + ((i * 5) % 20) : 12 + i * 6;
          return (
            <div key={s.id} className="flex gap-3">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-[10px] font-bold text-slate-400">
                {done ? "✓" : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p
                    className={`text-[13px] font-semibold tracking-tight ${
                      current ? "text-cyan-50" : done ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {s.label}
                  </p>
                  {current && (
                    <motion.span
                      className="text-[10px] font-medium uppercase tracking-wider text-cyan-300/80"
                      animate={reduce ? undefined : { opacity: [0.55, 1, 0.55] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    >
                      Streaming
                    </motion.span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">{s.sub}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400/90 to-violet-500/85"
                    initial={false}
                    animate={{ width: `${Math.min(100, pct)}%` }}
                    transition={
                      reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 28 }
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

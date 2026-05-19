"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PROCESSING_STAGES } from "@/lib/ui/systemStateLanguage";

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
        setStage(PROCESSING_STAGES.length - 1);
        return;
      }
      setStage(0);
      const steps = [380, 520, 560, 620, 700];
      let acc = 0;
      for (let i = 0; i < steps.length; i++) {
        acc += steps[i]!;
        timers.push(
          window.setTimeout(() => {
            if (!cancelled) setStage((s) => Math.min(PROCESSING_STAGES.length - 1, s + 1));
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
    <motion.div
      className={`qi-sys-process ${className}`}
      role="status"
      aria-live="polite"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.35 }}
    >
      <span className="qi-sys-process-shimmer" aria-hidden />
      <div className="relative z-[1]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="qi-sys-process-label">Live intelligence processing</p>
          <span className="qi-sys-process-counter">
            {Math.min(stage + 1, PROCESSING_STAGES.length)}/{PROCESSING_STAGES.length}
          </span>
        </div>
        <div className="space-y-2">
          {PROCESSING_STAGES.map((s, i) => {
            const done = i < stage;
            const current = i === stage;
            const pct = done ? 100 : current ? 72 + ((i * 3) % 12) : 12 + i * 8;
            return (
              <div key={s.id} className="qi-sys-process-row">
                <span className="qi-sys-process-index" aria-hidden>
                  {done ? "·" : String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`qi-sys-process-step ${current ? "qi-sys-process-step--active" : ""}`}>
                    {s.label}
                  </p>
                  <p className="qi-sys-process-sub">{s.sub}</p>
                  <div className="qi-sys-process-track mt-1.5">
                    <motion.div
                      className="qi-sys-process-fill"
                      initial={false}
                      animate={{ width: `${Math.min(100, pct)}%` }}
                      transition={
                        reduce ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 32 }
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

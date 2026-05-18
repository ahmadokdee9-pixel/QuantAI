"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Brain, Shield, Sparkles } from "lucide-react";

const SIGNALS = [
  { icon: Sparkles, label: "QI composite" },
  { icon: Shield, label: "Trust-weighted" },
  { icon: Brain, label: "Tray context" },
] as const;

/** Minimal signal literacy — one quiet line, no essays. */
export default function IntelligenceEducationStrip() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.28 }}
      className="mb-8"
    >
      <p className="qi-silent-whisper text-center sm:text-left">
        Signals read the full tray—not each listing alone.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-6 sm:justify-start sm:gap-8">
        {SIGNALS.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-2 text-[11px] font-medium tracking-wide text-slate-500/85"
          >
            <Icon className="size-3.5 text-slate-500/55" strokeWidth={1.5} aria-hidden />
            {label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

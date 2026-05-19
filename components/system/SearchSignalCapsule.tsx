"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { InstitutionalState } from "@/lib/ui/systemStateLanguage";

type Props = {
  state: InstitutionalState;
  onAction?: () => void;
  className?: string;
};

export default function SearchSignalCapsule({ state, onAction, className = "" }: Props) {
  const reduceMotion = useReducedMotion();
  const toneClass =
    state.variant === "throughput"
      ? "qi-sys-capsule--amber"
      : state.variant === "access"
        ? "qi-sys-capsule--cyan"
        : state.variant === "empty"
          ? "qi-sys-capsule--neutral"
          : "qi-sys-capsule--signal";

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`qi-sys-capsule qi-sys-capsule--hero ${toneClass} mx-auto mt-6 max-w-xl sm:mt-6 ${className}`}
    >
      <span className="qi-sys-pulse-dot" aria-hidden />
      <div className="qi-sys-capsule-body min-w-0 flex-1 text-left">
        <p className="qi-sys-capsule-headline">{state.headline}</p>
        <p className="qi-sys-capsule-supporting">{state.supporting}</p>
      </div>
      {onAction ? (
        <button type="button" onClick={onAction} className="qi-sys-capsule-cta shrink-0">
          {state.ctaLabel}
        </button>
      ) : null}
    </motion.div>
  );
}

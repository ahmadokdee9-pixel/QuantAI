"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { InstitutionalState } from "@/lib/ui/systemStateLanguage";

type Props = {
  state: InstitutionalState;
  onAction?: () => void;
  className?: string;
};

export default function InstitutionalStatePanel({ state, onAction, className = "" }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      aria-live="polite"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`qa-ui-state-panel qi-sys-panel mx-auto max-w-lg ${className}`}
    >
      <span className="qi-sys-panel-rim" aria-hidden />
      <span className="qi-sys-panel-glow" aria-hidden />
      <div className="relative z-[1] px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex items-center gap-2.5">
          <span className="qi-sys-pulse-dot qi-sys-pulse-dot--panel" aria-hidden />
          <p className="qi-sys-overline">Intelligence state</p>
        </div>
        <h2 className="qi-sys-panel-headline mt-3">{state.headline}</h2>
        <p className="qi-sys-panel-body mt-2">{state.supporting}</p>
        {state.detail && state.detail !== state.headline && state.detail !== state.supporting ? (
          <p className="qi-sys-panel-detail mt-3">{state.detail}</p>
        ) : null}
        {state.recoveryHints.length > 0 ? (
          <ul className="qi-sys-hints mt-4">
            {state.recoveryHints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        ) : null}
        {onAction ? (
          <button type="button" onClick={onAction} className="qi-sys-panel-cta mt-6 w-full">
            {state.ctaLabel}
          </button>
        ) : null}
        <p className="qi-sys-footnote mt-4">{state.footnote}</p>
      </div>
    </motion.section>
  );
}

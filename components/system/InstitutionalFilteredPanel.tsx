"use client";

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  visibleCount: number;
  onClearFilters: () => void;
};

/** Tray visible but filters removed all rows — not a failure state. */
export default function InstitutionalFilteredPanel({ visibleCount, onClearFilters }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      aria-live="polite"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="qi-sys-panel qi-sys-panel--neutral mx-auto max-w-md"
    >
      <span className="qi-sys-panel-rim" aria-hidden />
      <div className="relative z-[1] px-6 py-7 text-center sm:px-8">
        <p className="qi-sys-overline">Field constraint</p>
        <h2 className="qi-sys-panel-headline mt-3">Comparison tray filtered to zero visibility</h2>
        <p className="qi-sys-panel-body mt-2">
          This scan still holds{" "}
          <span className="tabular-nums font-medium text-slate-300">{visibleCount}</span> listings —
          widen a constraint to restore the synthesis view.
        </p>
        <button type="button" onClick={onClearFilters} className="qi-sys-panel-cta mt-6 w-full">
          Restore full tray
        </button>
      </div>
    </motion.section>
  );
}

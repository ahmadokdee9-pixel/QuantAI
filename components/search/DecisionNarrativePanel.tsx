"use client";

/**
 * Compact Decision Narrative — premium analyst reading surface.
 * Reuses Instant Decision language; progressive reveal only.
 */

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { DecisionNarrativeBrief } from "@/lib/decisionNarrative/types";

type Props = {
  narrative: DecisionNarrativeBrief;
  compact?: boolean;
};

const PREVIEW_IDS = new Set([
  "situation",
  "confidence",
  "expected_next",
  "what_would_change",
]);

export default function DecisionNarrativePanel({ narrative, compact = false }: Props) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  const previewOrder = [
    "situation",
    "confidence",
    "expected_next",
    "what_would_change",
  ] as const;
  const preview = previewOrder
    .map((id) => narrative.blocks.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b));
  const rest = narrative.blocks.filter((b) => !PREVIEW_IDS.has(b.id));

  function renderBlock(
    block: DecisionNarrativeBrief["blocks"][number],
    index: number
  ) {
    return (
      <motion.article
        key={block.id}
        className="qa-decision-narrative__block"
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.26, ease: [0.22, 1, 0.36, 1], delay: Math.min(index * 0.03, 0.15) }
        }
      >
        <h4 className="qa-decision-narrative__title">{block.title}</h4>
        {block.lines.map((line) => (
          <p key={line} className="qa-decision-narrative__line">
            {line}
          </p>
        ))}
      </motion.article>
    );
  }

  return (
    <section
      className={`qa-instant-decision__block qa-instant-decision__block--full qa-decision-narrative${
        compact ? " qa-decision-narrative--compact" : ""
      }`}
      aria-label="Decision narrative"
    >
      <header className="qa-decision-narrative__head">
        <h3 className="qa-instant-decision__block-title">Reasoning</h3>
        {narrative.lead && !compact ? (
          <p className="qa-decision-narrative__lead">{narrative.lead}</p>
        ) : null}
      </header>

      <div className="qa-decision-narrative__blocks">
        {preview.map((b, i) => renderBlock(b, i))}
        <AnimatePresence initial={false}>
          {open && !compact
            ? rest.map((b, i) => renderBlock(b, i + preview.length))
            : null}
        </AnimatePresence>
      </div>

      {!compact && rest.length > 0 ? (
        <button
          type="button"
          className="qa-decision-narrative__toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Less detail" : "More detail"}
          <ChevronDown
            className={`size-3.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
      ) : null}
    </section>
  );
}

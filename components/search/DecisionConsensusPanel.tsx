"use client";

/**
 * Compact Decision Consensus surface — existing Instant Decision language only.
 */

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { DecisionConsensusBrief } from "@/lib/decisionConsensus/types";

type Props = {
  consensus: DecisionConsensusBrief;
  compact?: boolean;
};

function statusMod(status: DecisionConsensusBrief["status"]): string {
  switch (status) {
    case "consensus_strong":
    case "confidence_confirmed":
      return "strong";
    case "consensus_building":
    case "waiting_confirmation":
      return "building";
    case "consensus_weak":
      return "weak";
    case "conflicting_evidence":
    case "consensus_lost":
      return "conflict";
    case "new_evidence":
      return "new";
    default:
      return "weak";
  }
}

export default function DecisionConsensusPanel({ consensus, compact = false }: Props) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const mod = statusMod(consensus.status);

  return (
    <section
      className={`qa-instant-decision__block qa-instant-decision__block--full qa-decision-consensus qa-decision-consensus--${mod}${
        consensus.changed ? " qa-decision-consensus--changed" : ""
      }`}
      aria-label="Decision consensus"
    >
      <button
        type="button"
        className="qa-decision-consensus__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="qa-decision-consensus__chip">
          <span className="qa-decision-consensus__dot" aria-hidden />
          {consensus.label}
        </span>
        <span className="qa-decision-consensus__summary">{consensus.summary}</span>
        <ChevronDown
          className={`size-3.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="consensus-body"
            className="qa-decision-consensus__body"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="qa-instant-decision__grid">
              <div>
                <h4 className="qa-instant-decision__block-title">Why consensus exists</h4>
                <ul className="qa-instant-decision__list">
                  {consensus.whyConsensus.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="qa-instant-decision__block-title">Engines that agree</h4>
                {consensus.enginesAgree.length ? (
                  <ul className="qa-instant-decision__list">
                    {consensus.enginesAgree.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="qa-instant-decision__horizon-note">No agreeing modules yet.</p>
                )}
              </div>
              <div>
                <h4 className="qa-instant-decision__block-title">Engines that disagree</h4>
                {consensus.enginesDisagree.length ? (
                  <ul className="qa-instant-decision__list qa-instant-decision__list--risk">
                    {consensus.enginesDisagree.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="qa-instant-decision__horizon-note">No disagreeing modules.</p>
                )}
              </div>
              <div>
                <h4 className="qa-instant-decision__block-title">Missing evidence</h4>
                <ul className="qa-instant-decision__list qa-instant-decision__list--risk">
                  {consensus.missingEvidence.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>

            {!compact ? (
              <dl className="qa-instant-decision__signals mt-3">
                <div className="qa-instant-decision__signal">
                  <dt>Expected confirmation</dt>
                  <dd>{consensus.expectedConfirmation || "—"}</dd>
                </div>
                <div className="qa-instant-decision__signal">
                  <dt>Confidence trend · {consensus.confidenceTrend.trend}</dt>
                  <dd>{consensus.confidenceTrend.explanation}</dd>
                </div>
                <div className="qa-instant-decision__signal">
                  <dt>
                    Modules · {consensus.agreeCount} agree · {consensus.disagreeCount} disagree ·{" "}
                    {consensus.availableCount} available
                  </dt>
                  <dd>
                    {consensus.modules
                      .filter((m) => m.stance !== "unavailable")
                      .map((m) => `${m.label} (${m.stance})`)
                      .join(" · ")}
                  </dd>
                </div>
              </dl>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

"use client";

/**
 * Microscopic living status under Instant Decision — real livingThread / freshness only.
 */

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LivingDecisionThread } from "@/lib/livingDecision/types";
import type { SourceFreshness } from "@/lib/universalDecision/types";
import { thesisContinuityHeadline } from "@/lib/decisionThesis/snapshot";

type Props = {
  livingThread?: LivingDecisionThread | null;
  freshness?: SourceFreshness | null;
  confidence?: number | null;
  previousConfidence?: number | null;
};

function relativeAge(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const mins = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function EnginePresenceLine({
  livingThread = null,
  freshness = null,
  confidence = null,
  previousConfidence = null,
}: Props) {
  const reduceMotion = useReducedMotion();

  const text = useMemo(() => {
    const continuity = livingThread?.recentChanges?.length
      ? thesisContinuityHeadline(livingThread.recentChanges)
      : null;
    if (continuity) return continuity;

    if (
      previousConfidence != null &&
      confidence != null &&
      Math.round(confidence) > Math.round(previousConfidence)
    ) {
      return `Confidence increased (${Math.round(previousConfidence)}% → ${Math.round(confidence)}%)`;
    }

    const eventCount = livingThread?.events?.length ?? 0;
    if (eventCount > 0) {
      const lastAt = livingThread?.events[livingThread.events.length - 1]?.at;
      const age = relativeAge(lastAt || livingThread?.current?.timestamp);
      return age
        ? `Living Decision · ${eventCount} event${eventCount === 1 ? "" : "s"} · updated ${age}`
        : `Living Decision · ${eventCount} event${eventCount === 1 ? "" : "s"}`;
    }

    if (freshness?.fetchedAt) {
      const age = relativeAge(freshness.fetchedAt);
      const stale = freshness.stale || freshness.status === "stale";
      return age
        ? `${stale ? "Evidence aging" : "Evidence fresh"} · ${age}`
        : freshness.status === "fresh"
          ? "Evidence fresh"
          : "Monitoring evidence freshness";
    }

    if (livingThread?.watched) return "Watching this decision";
    return null;
  }, [livingThread, freshness, confidence, previousConfidence]);

  if (!text) return null;

  return (
    <motion.p
      className="qa-living-presence qa-living-presence--decision"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.28 }}
      aria-live="polite"
    >
      <span className="qa-living-presence__dot" aria-hidden />
      <span className="qa-living-presence__line qa-living-presence__line--live">{text}</span>
    </motion.p>
  );
}

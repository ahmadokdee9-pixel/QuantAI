"use client";

/**
 * Microscopic living status under Instant Decision — real living / consensus / analyst only.
 * Never invents activity.
 */

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { AnalystDecisionBrief } from "@/lib/decisionAnalyst/types";
import type { DecisionConsensusBrief } from "@/lib/decisionConsensus/types";
import type { LivingDecisionThread } from "@/lib/livingDecision/types";
import type { SourceFreshness } from "@/lib/universalDecision/types";
import { thesisContinuityHeadline } from "@/lib/decisionThesis/snapshot";

type Props = {
  livingThread?: LivingDecisionThread | null;
  freshness?: SourceFreshness | null;
  confidence?: number | null;
  previousConfidence?: number | null;
  analyst?: AnalystDecisionBrief | null;
  consensus?: DecisionConsensusBrief | null;
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
  analyst = null,
  consensus = null,
}: Props) {
  const reduceMotion = useReducedMotion();

  const { text, tone } = useMemo(() => {
    const continuity = livingThread?.recentChanges?.length
      ? thesisContinuityHeadline(livingThread.recentChanges)
      : null;
    if (continuity) return { text: continuity, tone: "alert" as const };

    if (consensus?.changed && consensus.label) {
      return { text: `${consensus.label} · reassessing evidence`, tone: "alert" as const };
    }

    if (
      previousConfidence != null &&
      confidence != null &&
      Math.round(confidence) !== Math.round(previousConfidence)
    ) {
      const up = Math.round(confidence) > Math.round(previousConfidence);
      return {
        text: `Confidence ${up ? "rising" : "easing"} (${Math.round(previousConfidence)}% → ${Math.round(confidence)}%)`,
        tone: "live" as const,
      };
    }

    if (consensus?.status === "waiting_confirmation" || consensus?.status === "consensus_building") {
      return {
        text: `${consensus.label} · monitoring confirmation signals`,
        tone: "calm" as const,
      };
    }

    const nextEvent = analyst?.thesis?.nextExpectedEvent || analyst?.watchEvents?.[0];
    if (nextEvent) {
      return { text: `Watching · ${nextEvent}`, tone: "calm" as const };
    }

    const eventCount = livingThread?.events?.length ?? 0;
    if (eventCount > 0) {
      const lastAt = livingThread?.events[livingThread.events.length - 1]?.at;
      const age = relativeAge(lastAt || livingThread?.current?.timestamp);
      return {
        text: age
          ? `Remembering · ${eventCount} living event${eventCount === 1 ? "" : "s"} · ${age}`
          : `Remembering · ${eventCount} living event${eventCount === 1 ? "" : "s"}`,
        tone: "live" as const,
      };
    }

    if (freshness?.fetchedAt) {
      const age = relativeAge(freshness.fetchedAt);
      const stale = freshness.stale || freshness.status === "stale";
      return {
        text: age
          ? `${stale ? "Evidence aging" : "Observing evidence"} · ${age}`
          : stale
            ? "Evidence aging"
            : "Observing evidence",
        tone: stale ? ("alert" as const) : ("live" as const),
      };
    }

    if (livingThread?.watched) {
      return { text: "Observing this decision", tone: "live" as const };
    }

    if (consensus?.label) {
      return { text: `${consensus.label} · quiet`, tone: "calm" as const };
    }

    return { text: null as string | null, tone: "idle" as const };
  }, [livingThread, freshness, confidence, previousConfidence, analyst, consensus]);

  if (!text) return null;

  const lineTone =
    tone === "alert"
      ? "qa-living-presence__line--alert"
      : tone === "calm"
        ? "qa-living-presence__line--calm"
        : tone === "idle"
          ? "qa-living-presence__line--idle"
          : "qa-living-presence__line--live";

  return (
    <motion.p
      className="qa-living-presence qa-living-presence--decision"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.28 }}
      aria-live="polite"
    >
      <span
        className={`qa-living-presence__dot${tone === "live" || tone === "alert" ? " qa-living-presence__dot--active" : ""}`}
        aria-hidden
      />
      <span className={`qa-living-presence__line ${lineTone}`}>{text}</span>
    </motion.p>
  );
}

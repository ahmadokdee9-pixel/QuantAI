/**
 * P6.1 — Urgency/readiness + hesitation/friction intent signals.
 */

import type { BehavioralCommerceMeta } from "@/lib/behavioral/behavioralTelemetry";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";

export type IntentReadiness = {
  readinessIntent: number;
  hesitationIntent: number;
  readinessLane: "ready" | "warming" | "blocked";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateIntentReadiness(args: {
  canonicalQuery: CanonicalQueryContract;
  behavioral: BehavioralCommerceMeta;
  cognition: CognitionEngineMeta;
}): IntentReadiness {
  const { canonicalQuery, behavioral, cognition } = args;

  const readinessIntent = clamp(
    canonicalQuery.intent.urgency01 * 0.35 +
      behavioral.conversionReadiness * 0.35 +
      cognition.conversionProbability * 0.3,
    0,
    1
  );
  const hesitationIntent = clamp(
    behavioral.decisionHesitation * 0.4 + behavioral.buyingFriction * 0.35 + (1 - readinessIntent) * 0.25,
    0,
    1
  );

  let readinessLane: IntentReadiness["readinessLane"] = "warming";
  if (readinessIntent >= 0.55 && hesitationIntent < 0.4) readinessLane = "ready";
  else if (readinessIntent < 0.3 || hesitationIntent >= 0.55) readinessLane = "blocked";

  return {
    readinessIntent: Math.round(readinessIntent * 1000) / 1000,
    hesitationIntent: Math.round(hesitationIntent * 1000) / 1000,
    readinessLane,
  };
}

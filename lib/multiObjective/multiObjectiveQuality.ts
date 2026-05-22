/**
 * P6.2 — Quality objective signal.
 */

import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";

export type QualityObjective = {
  qualityObjective: number;
  qualityConfidence: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateQualityObjective(args: {
  decision: DecisionIntelligenceMeta;
  cognition: CognitionEngineMeta;
}): QualityObjective {
  const { decision, cognition } = args;
  const qualityObjective = clamp(
    (decision.qualityDecision ?? 0) * 0.35 +
      (decision.analytics?.purchaseQualityAnalytics ?? 0) * 0.01 * 0.35 +
      (cognition.cognitionScore ?? 0) * 0.01 * 0.2 +
      (decision.analytics?.recommendationQualityAnalytics ?? 0) * 0.01 * 0.1,
    0,
    1
  );
  return {
    qualityObjective: Math.round(qualityObjective * 1000) / 1000,
    qualityConfidence: Math.round((decision.decisionConfidence ?? 0) * 1000) / 1000,
  };
}

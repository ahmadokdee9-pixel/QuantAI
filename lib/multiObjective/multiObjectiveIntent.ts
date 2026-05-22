/**
 * P6.2 — Intent objective signal (from P6.1 intent cognition).
 */

import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";

export type IntentObjective = {
  intentObjective: number;
  recommendationObjective: number;
  comparisonObjective: number;
  explorationObjective: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateIntentObjective(intent: IntentCognitionMeta): IntentObjective {
  const intentObjective = clamp(
    (intent.intentConfidence ?? 0) * 0.25 +
      (intent.recommendationIntent ?? 0) * 0.2 +
      (intent.comparisonIntent ?? 0) * 0.15 +
      (1 - (intent.hesitationIntent ?? 0)) * 0.15 +
      (intent.readinessIntent ?? 0) * 0.15 +
      (intent.intentScore ?? 0) * 0.01 * 0.1,
    0,
    1
  );
  return {
    intentObjective: Math.round(intentObjective * 1000) / 1000,
    recommendationObjective: intent.recommendationIntent ?? 0,
    comparisonObjective: intent.comparisonIntent ?? 0,
    explorationObjective: intent.explorationIntent ?? 0,
  };
}

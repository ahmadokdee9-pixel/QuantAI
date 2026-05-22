/**
 * P6.2 — Cross-objective contradiction detection.
 */

import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { UnifiedMultiObjectiveState } from "@/lib/multiObjective/multiObjectiveFusion";
import type { ValueObjective } from "@/lib/multiObjective/multiObjectiveValue";

export type MultiObjectiveContradictionResult = {
  contradictionCount: number;
  contradictions: string[];
  uncertaintyScore: number;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function detectMultiObjectiveContradictions(args: {
  state: UnifiedMultiObjectiveState;
  value: ValueObjective;
  intent: IntentCognitionMeta;
  cognition: CognitionEngineMeta;
}): MultiObjectiveContradictionResult {
  const { state, value, intent, cognition } = args;
  const contradictions: string[] = [];

  if (state.priceObjective >= 0.5 && value.premiumObjective >= 0.5) contradictions.push("price_premium_conflict");
  if (state.qualityObjective >= 0.5 && state.priceObjective >= 0.55) contradictions.push("quality_price_tension");
  if (state.conversionObjective >= 0.5 && intent.hesitationIntent >= 0.5) contradictions.push("conversion_hesitation_conflict");
  if (state.trustObjective >= 0.5 && state.priceObjective >= 0.6 && state.qualityObjective < 0.3) {
    contradictions.push("trust_price_quality_gap");
  }
  if (intent.contradictionCount >= 2) contradictions.push("intent_upstream_conflict");
  if (intent.rollbackTriggered) contradictions.push("intent_rollback");
  if (cognition.rollbackTriggered) contradictions.push("cognition_rollback");
  if (state.objectiveBalance < 0.35) contradictions.push("objective_imbalance");

  const uncertaintyScore = round3(
    Math.min(1, contradictions.length * 0.12 + (1 - state.objectiveBalance) * 0.2 + intent.contradictionCount * 0.06)
  );

  return {
    contradictionCount: contradictions.length,
    contradictions: contradictions.slice(0, 8),
    uncertaintyScore,
  };
}

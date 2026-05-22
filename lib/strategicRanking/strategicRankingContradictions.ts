/**
 * P6.3 — Strategic ranking contradiction detection.
 */

import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { UnifiedStrategicRankingState } from "@/lib/strategicRanking/strategicRankingFusion";
import type { StrategicRankingGuards } from "@/lib/strategicRanking/strategicRankingGuards";

export type StrategicRankingContradictionResult = {
  contradictionCount: number;
  contradictions: string[];
  uncertaintyScore: number;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function detectStrategicRankingContradictions(args: {
  state: UnifiedStrategicRankingState;
  guards: StrategicRankingGuards;
  multiObjective: MultiObjectiveCommerceMeta;
  intent: IntentCognitionMeta;
}): StrategicRankingContradictionResult {
  const { state, guards, multiObjective, intent } = args;
  const contradictions: string[] = [];

  if (state.trustValueBalance < 0.35 && state.trustObjective >= 0.5 && state.valueObjective >= 0.5) {
    contradictions.push("trust_value_tension");
  }
  if (state.premiumAffordabilityBalance < 0.35) contradictions.push("premium_affordability_tension");
  if (state.conversionStabilityBalance < 0.35) contradictions.push("conversion_stability_tension");
  if (state.aestheticPracticalityBalance < 0.35) contradictions.push("aesthetic_practicality_tension");
  if (guards.inflationGuardActive) contradictions.push("score_inflation_risk");
  if (guards.trustDominanceGuardActive) contradictions.push("trust_dominance_risk");
  if (multiObjective.rollbackTriggered) contradictions.push("multi_objective_rollback");
  if (intent.rollbackTriggered) contradictions.push("intent_rollback");
  if (multiObjective.contradictionCount >= 2) contradictions.push("multi_objective_upstream_conflict");

  const uncertaintyScore = round3(
    Math.min(1, contradictions.length * 0.1 + (1 - state.strategicHarmony) * 0.2 + multiObjective.contradictionCount * 0.05)
  );

  return {
    contradictionCount: contradictions.length,
    contradictions: contradictions.slice(0, 8),
    uncertaintyScore,
  };
}

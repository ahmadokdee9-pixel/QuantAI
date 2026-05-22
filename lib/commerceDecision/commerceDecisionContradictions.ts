/**
 * P6.6 — Commerce decision contradiction detection.
 */

import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { CommerceDecisionDetection } from "@/lib/commerceDecision/commerceDecisionDetection";
import type { UnifiedCommerceDecisionState } from "@/lib/commerceDecision/commerceDecisionFusion";

export type CommerceDecisionContradictionResult = {
  contradictionCount: number;
  contradictions: string[];
  uncertaintyScore: number;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function detectCommerceDecisionContradictions(args: {
  state: UnifiedCommerceDecisionState;
  detection: CommerceDecisionDetection;
  marketReality: MarketRealityIntelligenceMeta;
}): CommerceDecisionContradictionResult {
  const { state, detection, marketReality } = args;
  const contradictions: string[] = [];

  if (detection.weakRecommendationStructureDetected && state.recommendationIntegrityStability >= 0.6) contradictions.push("structure_integrity_conflict");
  if (detection.unsafePromotionDominanceDetected && state.trustworthyDecisionContinuity >= 0.55) contradictions.push("promotion_continuity_conflict");
  if (detection.trustValueImbalanceEscalationDetected && state.balancedDecisionFormation >= 0.55) contradictions.push("trust_value_balance_conflict");
  if (detection.decisionInconsistencyDetected && detection.decisionQualityScore >= 0.6) contradictions.push("quality_consistency_conflict");
  if (marketReality.rollbackTriggered) contradictions.push("reality_rollback");
  if (marketReality.contradictionCount >= 2) contradictions.push("reality_upstream_conflict");
  if (state.decisionHarmony < 0.35) contradictions.push("decision_imbalance");

  const uncertaintyScore = round3(
    Math.min(1, contradictions.length * 0.1 + (1 - state.decisionHarmony) * 0.2 + marketReality.contradictionCount * 0.05)
  );

  return {
    contradictionCount: contradictions.length,
    contradictions: contradictions.slice(0, 8),
    uncertaintyScore,
  };
}

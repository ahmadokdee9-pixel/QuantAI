/**
 * P6.6 — Commerce decision confidence + signal bundle.
 */

import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { CommerceDecisionContradictionResult } from "@/lib/commerceDecision/commerceDecisionContradictions";
import type { CommerceDecisionDetection } from "@/lib/commerceDecision/commerceDecisionDetection";
import type { UnifiedCommerceDecisionState } from "@/lib/commerceDecision/commerceDecisionFusion";

export type CommerceDecisionSignalBundle = {
  decisionQualityScore: number;
  weakRecommendationStructureScore: number;
  unstableRecommendationOutcomeScore: number;
  unsafePromotionDominanceScore: number;
  lowConfidencePurchaseDecisionScore: number;
  trustValueImbalanceEscalationScore: number;
  conversionManipulationPressureScore: number;
  decisionInconsistencyScore: number;
  unstableStrategicTradeoffScore: number;
  trustworthyDecisionContinuity: number;
  recommendationIntegrityStability: number;
  balancedDecisionFormation: number;
  decisionHarmony: number;
  signalHash: string;
  graphExecutionHash: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function buildCommerceDecisionSignalBundle(state: UnifiedCommerceDecisionState): CommerceDecisionSignalBundle {
  const core = {
    decisionQualityScore: state.decisionQualityScore,
    weakRecommendationStructureScore: state.weakRecommendationStructureScore,
    unstableRecommendationOutcomeScore: state.unstableRecommendationOutcomeScore,
    unsafePromotionDominanceScore: state.unsafePromotionDominanceScore,
    lowConfidencePurchaseDecisionScore: state.lowConfidencePurchaseDecisionScore,
    trustValueImbalanceEscalationScore: state.trustValueImbalanceEscalationScore,
    conversionManipulationPressureScore: state.conversionManipulationPressureScore,
    decisionInconsistencyScore: state.decisionInconsistencyScore,
    unstableStrategicTradeoffScore: state.unstableStrategicTradeoffScore,
    trustworthyDecisionContinuity: state.trustworthyDecisionContinuity,
    recommendationIntegrityStability: state.recommendationIntegrityStability,
    balancedDecisionFormation: state.balancedDecisionFormation,
    decisionHarmony: state.decisionHarmony,
  };

  const signalHash = Object.entries(core)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(Number(v) * 1000)}`)
    .join("|");

  const graphExecutionHash = [
    `qual:${core.decisionQualityScore}`,
    `cont:${core.trustworthyDecisionContinuity}`,
    `form:${core.balancedDecisionFormation}`,
    `harm:${core.decisionHarmony}`,
  ].join(",");

  return { ...core, signalHash, graphExecutionHash };
}

export function computeCommerceDecisionConfidence(args: {
  signals: CommerceDecisionSignalBundle;
  strategic: AdaptiveStrategicRankingMeta;
  marketReality: MarketRealityIntelligenceMeta;
  detection: CommerceDecisionDetection;
  contradictions: CommerceDecisionContradictionResult;
  governanceDampen: number;
}): number {
  const { signals, strategic, marketReality, detection, contradictions, governanceDampen } = args;

  const signalConfidence = clamp(
    signals.decisionHarmony * 0.22 +
      signals.balancedDecisionFormation * 0.18 +
      signals.trustworthyDecisionContinuity * 0.15 +
      signals.recommendationIntegrityStability * 0.12 +
      (strategic.strategicRankingConfidence ?? 0) * 0.1 +
      (marketReality.realityConfidence ?? 0) * 0.08 -
      signals.lowConfidencePurchaseDecisionScore * 0.08 -
      (detection.decisionInconsistencyDetected ? 0.05 : 0),
    0,
    1
  );

  return round3(clamp((signalConfidence - contradictions.uncertaintyScore * 0.1) * governanceDampen, 0, 1));
}

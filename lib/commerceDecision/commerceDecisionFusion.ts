/**
 * P6.6 — Unified commerce decision state synthesis.
 */

import type { CommerceDecisionDetection } from "@/lib/commerceDecision/commerceDecisionDetection";
import type { CommerceDecisionStabilization } from "@/lib/commerceDecision/commerceDecisionStabilization";

export type UnifiedCommerceDecisionState = {
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
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function synthesizeUnifiedCommerceDecisionState(args: {
  detection: CommerceDecisionDetection;
  stabilization: CommerceDecisionStabilization;
}): UnifiedCommerceDecisionState {
  const riskScores = [
    args.detection.weakRecommendationStructureScore,
    args.detection.unstableRecommendationOutcomeScore,
    args.detection.unsafePromotionDominanceScore,
    args.detection.lowConfidencePurchaseDecisionScore,
    args.detection.trustValueImbalanceEscalationScore,
    args.detection.conversionManipulationPressureScore,
    args.detection.decisionInconsistencyScore,
    args.detection.unstableStrategicTradeoffScore,
  ];
  const meanRisk = riskScores.reduce((s, v) => s + v, 0) / riskScores.length;
  const decisionHarmony = round3(clamp(args.stabilization.balancedDecisionFormation * 0.55 + (1 - meanRisk) * 0.45, 0, 1));

  return {
    decisionQualityScore: args.detection.decisionQualityScore,
    weakRecommendationStructureScore: args.detection.weakRecommendationStructureScore,
    unstableRecommendationOutcomeScore: args.detection.unstableRecommendationOutcomeScore,
    unsafePromotionDominanceScore: args.detection.unsafePromotionDominanceScore,
    lowConfidencePurchaseDecisionScore: args.detection.lowConfidencePurchaseDecisionScore,
    trustValueImbalanceEscalationScore: args.detection.trustValueImbalanceEscalationScore,
    conversionManipulationPressureScore: args.detection.conversionManipulationPressureScore,
    decisionInconsistencyScore: args.detection.decisionInconsistencyScore,
    unstableStrategicTradeoffScore: args.detection.unstableStrategicTradeoffScore,
    trustworthyDecisionContinuity: args.stabilization.trustworthyDecisionContinuity,
    recommendationIntegrityStability: args.stabilization.recommendationIntegrityStability,
    balancedDecisionFormation: args.stabilization.balancedDecisionFormation,
    decisionHarmony,
  };
}

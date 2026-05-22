/**
 * P6.6 — Commerce decision intelligence telemetry (meta.commerceDecisionIntelligence).
 */

import type { CommerceDecisionBalanceResult, CommerceDecisionBlendInfluence } from "@/lib/commerceDecision/commerceDecisionBalancer";
import type { CommerceDecisionContradictionResult } from "@/lib/commerceDecision/commerceDecisionContradictions";
import type { CommerceDecisionDetection } from "@/lib/commerceDecision/commerceDecisionDetection";
import type { CommerceDecisionIntelligenceMode, CommerceDecisionRoutingLane } from "@/lib/commerceDecision/commerceDecisionFlags";
import type { CommerceDecisionIntelligenceProfile } from "@/lib/commerceDecision/commerceDecisionProfiles";
import type { CommerceDecisionSignalBundle } from "@/lib/commerceDecision/commerceDecisionConfidence";

export type CommerceDecisionIntelligenceAnalytics = {
  qualityAnalytics: number;
  recommendationAnalytics: number;
  outcomeAnalytics: number;
  promotionAnalytics: number;
  purchaseAnalytics: number;
  trustValueAnalytics: number;
  conversionAnalytics: number;
  consistencyAnalytics: number;
  tradeoffAnalytics: number;
  continuityAnalytics: number;
  integrityAnalytics: number;
  formationAnalytics: number;
  harmonyAnalytics: number;
  contradictionAnalytics: number;
  replayIntegrityAnalytics: number;
  topDriftCount: number;
};

export type CommerceDecisionIntelligenceMonitoring = {
  decisionInstability: boolean;
  contradictionRisk: boolean;
  promotionRisk: boolean;
  purchaseConfidenceRisk: boolean;
  replayIntegrityValid: boolean;
  continuityValid: boolean;
  crossDecisionBalanceValid: boolean;
  upstreamStable: boolean;
};

export type CommerceDecisionIntelligenceMeta = {
  version: "commerce-decision-intelligence-v1";
  decisionActive: boolean;
  decisionProfile: CommerceDecisionIntelligenceMode;
  decisionScore: number;
  decisionDelta: number;
  decisionConfidence: number;
  decisionQualityScore: number;
  weakRecommendationStructureDetected: boolean;
  unstableRecommendationOutcomeDetected: boolean;
  unsafePromotionDominanceDetected: boolean;
  lowConfidencePurchaseDecisionDetected: boolean;
  trustValueImbalanceEscalationDetected: boolean;
  conversionManipulationPressureDetected: boolean;
  decisionInconsistencyDetected: boolean;
  unstableStrategicTradeoffDetected: boolean;
  trustworthyDecisionContinuity: number;
  recommendationIntegrityStability: number;
  balancedDecisionFormation: number;
  contradictionCount: number;
  routingLane: CommerceDecisionRoutingLane | string;
  rollbackTriggered: boolean;
  decisionWarnings: string[];
  decisionAnomalies: string[];
  analytics: CommerceDecisionIntelligenceAnalytics;
  monitoring: CommerceDecisionIntelligenceMonitoring;
  mutationApplied: boolean;
  signalHash: string;
  graphExecutionHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildCommerceDecisionAnalytics(args: {
  signals: CommerceDecisionSignalBundle;
  influence: CommerceDecisionBlendInfluence;
  detection: CommerceDecisionDetection;
  contradictions: CommerceDecisionContradictionResult;
  replayIntegrity: number;
  topDrift: number;
}): CommerceDecisionIntelligenceAnalytics {
  const { signals, influence, detection, contradictions, replayIntegrity, topDrift } = args;
  return {
    qualityAnalytics: clampScore(signals.decisionQualityScore * 100),
    recommendationAnalytics: clampScore((1 - signals.weakRecommendationStructureScore) * 100 + influence.integrityInfluence * 15),
    outcomeAnalytics: clampScore((1 - signals.unstableRecommendationOutcomeScore) * 100 + influence.outcomeDampening * 10),
    promotionAnalytics: clampScore((1 - signals.unsafePromotionDominanceScore) * 100 + influence.promotionDampening * 10),
    purchaseAnalytics: clampScore((1 - signals.lowConfidencePurchaseDecisionScore) * 100),
    trustValueAnalytics: clampScore((1 - signals.trustValueImbalanceEscalationScore) * 100 + influence.trustValueStabilization * 15),
    conversionAnalytics: clampScore((1 - signals.conversionManipulationPressureScore) * 100 + influence.conversionStabilization * 15),
    consistencyAnalytics: clampScore((1 - signals.decisionInconsistencyScore) * 100),
    tradeoffAnalytics: clampScore((1 - signals.unstableStrategicTradeoffScore) * 100),
    continuityAnalytics: clampScore(influence.continuityInfluence * 100),
    integrityAnalytics: clampScore(influence.integrityInfluence * 100),
    formationAnalytics: clampScore(influence.formationReinforcement * 100),
    harmonyAnalytics: clampScore(signals.decisionHarmony * 100),
    contradictionAnalytics: clampScore(contradictions.uncertaintyScore * 100),
    replayIntegrityAnalytics: replayIntegrity,
    topDriftCount: topDrift,
  };
}

export function buildCommerceDecisionMonitoring(args: {
  influence: CommerceDecisionBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: CommerceDecisionBalanceResult;
  detection: CommerceDecisionDetection;
  contradictions: CommerceDecisionContradictionResult;
  topDrift: number;
  profile: CommerceDecisionIntelligenceProfile;
}): CommerceDecisionIntelligenceMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, detection, contradictions, profile } = args;
  return {
    decisionInstability: rollbackTriggered || !balance.realityStable,
    contradictionRisk: contradictions.contradictionCount >= 2,
    promotionRisk: detection.unsafePromotionDominanceDetected,
    purchaseConfidenceRisk: detection.lowConfidencePurchaseDecisionDetected,
    replayIntegrityValid: replayIntegrity >= 70,
    continuityValid: influence.continuityInfluence <= profile.maxContinuityAmplification,
    crossDecisionBalanceValid: influence.decisionDelta <= profile.maxDelta,
    upstreamStable: balance.realityStable,
  };
}

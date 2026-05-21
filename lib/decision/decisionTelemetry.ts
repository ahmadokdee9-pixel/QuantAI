/**
 * P5.6 — Decision intelligence telemetry (analytics + monitoring).
 */

import type { DecisionBalanceResult, DecisionBlendInfluence } from "@/lib/decision/decisionBalancer";
import type { DecisionIntelligenceMode, DecisionRoutingLane } from "@/lib/decision/decisionFlags";
import type { DecisionProfile } from "@/lib/decision/decisionProfiles";
import type { DecisionSignalBundle } from "@/lib/decision/decisionSignals";

export type DecisionIntelligenceAnalytics = {
  purchaseQualityAnalytics: number;
  recommendationQualityAnalytics: number;
  trustValueAnalytics: number;
  premiumBudgetAnalytics: number;
  comparisonIntelligenceAnalytics: number;
  deliveryConfidenceAnalytics: number;
  merchantReliabilityAnalytics: number;
  decisionDriftAnalytics: number;
  replayIntegrityAnalytics: number;
  topDriftCount: number;
};

export type DecisionMonitoring = {
  decisionInstability: boolean;
  confidenceInflation: boolean;
  merchantRisk: boolean;
  replayIntegrityValid: boolean;
  rankingDrift: boolean;
  deliveryConfidenceValid: boolean;
  recommendationStability: boolean;
  comparisonQuality: boolean;
};

export type DecisionIntelligenceMeta = {
  version: "decision-intelligence-v1";
  decisionActive: boolean;
  decisionProfile: DecisionIntelligenceMode;
  decisionScore: number;
  decisionDelta: number;
  decisionConfidence: number;
  trustDecision: number;
  valueDecision: number;
  premiumDecision: number;
  qualityDecision: number;
  budgetDecision: number;
  comparisonDecision: number;
  merchantDecision: number;
  deliveryDecision: number;
  replayIntegrity: number;
  continuityStrength: number;
  routingLane: DecisionRoutingLane | string;
  rollbackTriggered: boolean;
  decisionWarnings: string[];
  decisionAnomalies: string[];
  analytics: DecisionIntelligenceAnalytics;
  monitoring: DecisionMonitoring;
  mutationApplied: boolean;
  signalHash: string;
  graphExecutionHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildDecisionAnalytics(args: {
  signals: DecisionSignalBundle;
  influence: DecisionBlendInfluence;
  balance: DecisionBalanceResult;
  replayIntegrity: number;
  topDrift: number;
}): DecisionIntelligenceAnalytics {
  const { signals, influence, balance, replayIntegrity, topDrift } = args;
  return {
    purchaseQualityAnalytics: clampScore(influence.qualityDecision * 100 + signals.qualityConfidence * 40),
    recommendationQualityAnalytics: clampScore(signals.recommendationStrength * 100),
    trustValueAnalytics: clampScore(
      (influence.trustDecision + influence.valueDecision + signals.trustScore + signals.valueScore) * 25 + 1
    ),
    premiumBudgetAnalytics: clampScore((influence.premiumDecision + influence.budgetDecision) * 50),
    comparisonIntelligenceAnalytics: clampScore(influence.comparisonDecision * 100),
    deliveryConfidenceAnalytics: clampScore(signals.deliveryConfidence * 100),
    merchantReliabilityAnalytics: clampScore(signals.merchantReliability * 100),
    decisionDriftAnalytics: clampScore(100 - topDrift * 20),
    replayIntegrityAnalytics: replayIntegrity,
    topDriftCount: topDrift,
  };
}

export function buildDecisionMonitoring(args: {
  influence: DecisionBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: DecisionBalanceResult;
  signals: DecisionSignalBundle;
  topDrift: number;
  profile: DecisionProfile;
}): DecisionMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, signals, topDrift, profile } = args;
  return {
    decisionInstability: rollbackTriggered || !balance.reasoningStable,
    confidenceInflation:
      balance.decisionConfidence > 0.95 && influence.decisionDelta > profile.maxDelta * 0.8,
    merchantRisk: signals.returnRiskScore > 0.25 || signals.merchantReliability < 0.2,
    replayIntegrityValid: replayIntegrity >= 70,
    rankingDrift: topDrift > profile.maxDelta,
    deliveryConfidenceValid: signals.deliveryConfidence <= profile.maxDelta,
    recommendationStability: influence.trustDecision <= profile.maxTrustAmplification,
    comparisonQuality: influence.comparisonDecision <= profile.maxComparisonInfluence,
  };
}

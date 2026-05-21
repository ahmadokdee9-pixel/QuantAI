/**
 * P5.5 — Adaptive reasoning telemetry (analytics + monitoring).
 */

import type { ReasoningBalanceResult, ReasoningBlendInfluence } from "@/lib/reasoning/reasoningBalancer";
import type { AdaptiveReasoningMode, ReasoningRoutingLane } from "@/lib/reasoning/reasoningFlags";
import type { ReasoningProfile } from "@/lib/reasoning/reasoningProfiles";
import type { ReasoningSignalBundle } from "@/lib/reasoning/reasoningSignals";

export type AdaptiveReasoningAnalytics = {
  reasoningConfidenceAnalytics: number;
  comparisonIntelligenceAnalytics: number;
  recommendationQualityAnalytics: number;
  rankingContinuityAnalytics: number;
  trustValueAnalytics: number;
  premiumBudgetAnalytics: number;
  reasoningDriftAnalytics: number;
  commerceStabilityAnalytics: number;
  replayIntegrityAnalytics: number;
  topDriftCount: number;
};

export type ReasoningMonitoring = {
  reasoningInstability: boolean;
  confidenceInflation: boolean;
  replayIntegrityValid: boolean;
  rankingDrift: boolean;
  continuityValid: boolean;
  recommendationStability: boolean;
  comparisonQuality: boolean;
  commerceReasoningValid: boolean;
  trustAmplification: boolean;
};

export type AdaptiveReasoningMeta = {
  version: "adaptive-reasoning-v1";
  reasoningActive: boolean;
  reasoningProfile: AdaptiveReasoningMode;
  reasoningScore: number;
  reasoningDelta: number;
  reasoningConfidence: number;
  trustReasoning: number;
  valueReasoning: number;
  premiumReasoning: number;
  qualityReasoning: number;
  urgencyReasoning: number;
  recommendationReasoning: number;
  comparisonReasoning: number;
  replayIntegrity: number;
  continuityStrength: number;
  routingLane: ReasoningRoutingLane | string;
  rollbackTriggered: boolean;
  reasoningWarnings: string[];
  reasoningAnomalies: string[];
  analytics: AdaptiveReasoningAnalytics;
  monitoring: ReasoningMonitoring;
  mutationApplied: boolean;
  signalHash: string;
  graphExecutionHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildReasoningAnalytics(args: {
  signals: ReasoningSignalBundle;
  influence: ReasoningBlendInfluence;
  balance: ReasoningBalanceResult;
  replayIntegrity: number;
  topDrift: number;
}): AdaptiveReasoningAnalytics {
  const { signals, influence, balance, replayIntegrity, topDrift } = args;
  return {
    reasoningConfidenceAnalytics: clampScore(signals.reasoningConfidence * 100),
    comparisonIntelligenceAnalytics: clampScore(signals.comparisonConfidence * 100),
    recommendationQualityAnalytics: clampScore(signals.recommendationStrength * 100),
    rankingContinuityAnalytics: clampScore(influence.continuityStrength * 100),
    trustValueAnalytics: clampScore((influence.trustReasoning + influence.valueReasoning) * 50),
    premiumBudgetAnalytics: clampScore((influence.premiumReasoning + signals.budget) * 50),
    reasoningDriftAnalytics: clampScore(100 - topDrift * 20),
    commerceStabilityAnalytics: clampScore(signals.commerceStability * 100),
    replayIntegrityAnalytics: replayIntegrity,
    topDriftCount: topDrift,
  };
}

export function buildReasoningMonitoring(args: {
  influence: ReasoningBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: ReasoningBalanceResult;
  signals: ReasoningSignalBundle;
  topDrift: number;
  profile: ReasoningProfile;
}): ReasoningMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, signals, topDrift, profile } = args;
  return {
    reasoningInstability: rollbackTriggered || !balance.fusionStable,
    confidenceInflation: signals.reasoningConfidence > 0.95 && influence.reasoningDelta > profile.maxDelta * 0.8,
    replayIntegrityValid: replayIntegrity >= 70,
    rankingDrift: topDrift > profile.maxDelta,
    continuityValid: influence.continuityStrength <= profile.maxDelta,
    recommendationStability: influence.recommendationReasoning <= profile.maxConfidenceAmplification,
    comparisonQuality: influence.comparisonReasoning <= profile.maxConfidenceAmplification,
    commerceReasoningValid: signals.commerceStability >= 0.2 && balance.balanceScore >= 30,
    trustAmplification: influence.trustReasoning > profile.maxTrustAmplification,
  };
}

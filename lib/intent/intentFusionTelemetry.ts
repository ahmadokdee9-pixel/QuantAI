/**
 * P5.4 — Fusion telemetry (analytics + monitoring).
 */

import type { FusionBalanceResult, FusionBlendInfluence } from "@/lib/intent/intentFusionBalancer";
import type { IntentFusionMode, IntentFusionRoutingLane } from "@/lib/intent/intentFusionFlags";
import type { IntentFusionProfile } from "@/lib/intent/intentFusionProfiles";
import type { FusedCommerceSignals } from "@/lib/intent/intentSignalFusion";

export type IntentFusionAnalytics = {
  trustValueAnalytics: number;
  premiumBudgetAnalytics: number;
  suppressionRecoveryAnalytics: number;
  diversityPreservationAnalytics: number;
  continuityAnalytics: number;
  commerceConfidenceAnalytics: number;
  comparisonFusionAnalytics: number;
  rankingStabilizationAnalytics: number;
  merchantFairnessAnalytics: number;
  topDriftCount: number;
};

export type FusionMonitoring = {
  fusionInstability: boolean;
  rankingContinuityValid: boolean;
  confidenceInflation: boolean;
  suppressionImbalance: boolean;
  trustAmplification: boolean;
  replayIntegrityValid: boolean;
  fusionDrift: boolean;
  merchantFairnessValid: boolean;
};

export type IntentFusionMeta = {
  version: "intent-fusion-v1";
  fusionActive: boolean;
  fusionProfile: IntentFusionMode;
  fusionScore: number;
  fusionDelta: number;
  fusionConfidence: number;
  trustFusion: number;
  valueFusion: number;
  premiumFusion: number;
  qualityFusion: number;
  urgencyFusion: number;
  suppressionRecovery: number;
  diversityBalance: number;
  rankingContinuity: number;
  replayIntegrity: number;
  routingLane: IntentFusionRoutingLane | string;
  rollbackTriggered: boolean;
  fusionWarnings: string[];
  fusionAnomalies: string[];
  analytics: IntentFusionAnalytics;
  monitoring: FusionMonitoring;
  mutationApplied: boolean;
  signalHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildFusionAnalytics(args: {
  signals: FusedCommerceSignals;
  influence: FusionBlendInfluence;
  balance: FusionBalanceResult;
  merchantFairness: number;
  topDrift: number;
}): IntentFusionAnalytics {
  const { signals, influence, balance, merchantFairness, topDrift } = args;
  return {
    trustValueAnalytics: clampScore((influence.trustFusion + influence.valueFusion) * 50),
    premiumBudgetAnalytics: clampScore((influence.premiumFusion + signals.budget) * 50),
    suppressionRecoveryAnalytics: clampScore(influence.suppressionRecovery * 100),
    diversityPreservationAnalytics: clampScore(influence.diversityBalance * 100),
    continuityAnalytics: clampScore(influence.rankingContinuity * 100),
    commerceConfidenceAnalytics: clampScore(signals.fusionConfidence * 100),
    comparisonFusionAnalytics: clampScore(signals.comparisonQuality * 100),
    rankingStabilizationAnalytics: clampScore(balance.balanceScore),
    merchantFairnessAnalytics: merchantFairness,
    topDriftCount: topDrift,
  };
}

export function buildFusionMonitoring(args: {
  influence: FusionBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: FusionBalanceResult;
  signals: FusedCommerceSignals;
  merchantFairness: number;
  topDrift: number;
  profile: IntentFusionProfile;
}): FusionMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, signals, merchantFairness, topDrift, profile } = args;
  return {
    fusionInstability: rollbackTriggered || !balance.orchestrationStable,
    rankingContinuityValid: influence.rankingContinuity <= profile.maxDelta,
    confidenceInflation: signals.fusionConfidence > 0.95 && influence.fusionDelta > profile.maxDelta * 0.8,
    suppressionImbalance: influence.suppressionRecovery > profile.maxSuppressionRecovery,
    trustAmplification: influence.trustFusion > profile.maxTrustAmplification,
    replayIntegrityValid: replayIntegrity >= 70,
    fusionDrift: topDrift > profile.maxDelta,
    merchantFairnessValid: merchantFairness >= 40,
  };
}

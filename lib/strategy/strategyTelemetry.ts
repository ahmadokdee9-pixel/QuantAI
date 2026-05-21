/**
 * P5.7 — Strategy intelligence telemetry (analytics + monitoring).
 */

import type { StrategyBalanceResult, StrategyBlendInfluence } from "@/lib/strategy/strategyBalancer";
import type { StrategyIntelligenceMode, StrategyRoutingLane } from "@/lib/strategy/strategyFlags";
import type { StrategyProfile } from "@/lib/strategy/strategyProfiles";
import type { StrategySignalBundle } from "@/lib/strategy/strategySignals";

export type StrategyIntelligenceAnalytics = {
  conversionAnalytics: number;
  recommendationAnalytics: number;
  strategicTrustValueAnalytics: number;
  categoryDominanceAnalytics: number;
  comparisonIntelligenceAnalytics: number;
  merchantPositioningAnalytics: number;
  momentumAnalytics: number;
  rankingContinuityAnalytics: number;
  replayIntegrityAnalytics: number;
  topDriftCount: number;
};

export type StrategyMonitoring = {
  strategicInstability: boolean;
  conversionInflation: boolean;
  categoryDrift: boolean;
  replayIntegrityValid: boolean;
  rankingContinuityValid: boolean;
  recommendationStability: boolean;
  momentumInstability: boolean;
  comparisonQuality: boolean;
};

export type StrategyIntelligenceMeta = {
  version: "strategy-intelligence-v1";
  strategyActive: boolean;
  strategyProfile: StrategyIntelligenceMode;
  strategyScore: number;
  strategyDelta: number;
  strategyConfidence: number;
  conversionConfidence: number;
  strategicTrust: number;
  strategicValue: number;
  premiumPositioning: number;
  categoryDominance: number;
  recommendationHierarchy: number;
  comparisonIntelligence: number;
  merchantStrength: number;
  momentumConfidence: number;
  replayIntegrity: number;
  continuityStrength: number;
  routingLane: StrategyRoutingLane | string;
  rollbackTriggered: boolean;
  strategyWarnings: string[];
  strategyAnomalies: string[];
  analytics: StrategyIntelligenceAnalytics;
  monitoring: StrategyMonitoring;
  mutationApplied: boolean;
  signalHash: string;
  graphExecutionHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildStrategyAnalytics(args: {
  signals: StrategySignalBundle;
  influence: StrategyBlendInfluence;
  balance: StrategyBalanceResult;
  replayIntegrity: number;
  topDrift: number;
}): StrategyIntelligenceAnalytics {
  const { signals, influence, balance, replayIntegrity, topDrift } = args;
  return {
    conversionAnalytics: clampScore(signals.conversionConfidence * 100),
    recommendationAnalytics: clampScore(signals.recommendationHierarchy * 100 + influence.recommendationHierarchy * 20),
    strategicTrustValueAnalytics: clampScore(
      (influence.strategicTrust + influence.strategicValue + signals.strategicTrust + signals.strategicValue) * 25 + 1
    ),
    categoryDominanceAnalytics: clampScore(signals.categoryDominance * 100),
    comparisonIntelligenceAnalytics: clampScore(signals.comparisonIntelligence * 100),
    merchantPositioningAnalytics: clampScore(signals.merchantStrength * 100),
    momentumAnalytics: clampScore(signals.momentumConfidence * 100),
    rankingContinuityAnalytics: clampScore(influence.continuityStrength * 100),
    replayIntegrityAnalytics: replayIntegrity,
    topDriftCount: topDrift,
  };
}

export function buildStrategyMonitoring(args: {
  influence: StrategyBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: StrategyBalanceResult;
  signals: StrategySignalBundle;
  topDrift: number;
  profile: StrategyProfile;
}): StrategyMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, signals, topDrift, profile } = args;
  return {
    strategicInstability: rollbackTriggered || !balance.decisionStable,
    conversionInflation:
      balance.strategyConfidence > 0.95 && influence.strategyDelta > profile.maxDelta * 0.8,
    categoryDrift: topDrift > profile.maxDelta,
    replayIntegrityValid: replayIntegrity >= 70,
    rankingContinuityValid: influence.continuityStrength <= profile.maxDelta,
    recommendationStability: influence.recommendationHierarchy <= profile.maxConversionAmplification,
    momentumInstability: signals.momentumConfidence < 0.15 && balance.routingLane === "momentum-check",
    comparisonQuality: influence.comparisonIntelligence <= profile.maxComparisonAmplification,
  };
}

/**
 * P6.3 — Adaptive strategic ranking telemetry (meta.adaptiveStrategicRanking).
 */

import type { StrategicRankingBalanceResult, StrategicRankingBlendInfluence } from "@/lib/strategicRanking/strategicRankingBalancer";
import type { StrategicRankingContradictionResult } from "@/lib/strategicRanking/strategicRankingContradictions";
import type { AdaptiveStrategicRankingMode, StrategicRankingRoutingLane } from "@/lib/strategicRanking/strategicRankingFlags";
import type { AdaptiveStrategicRankingProfile } from "@/lib/strategicRanking/strategicRankingProfiles";
import type { StrategicRankingSignalBundle } from "@/lib/strategicRanking/strategicRankingConfidence";
import type { StrategicRankingGuards } from "@/lib/strategicRanking/strategicRankingGuards";

export type AdaptiveStrategicRankingAnalytics = {
  trustValueAnalytics: number;
  premiumAffordabilityAnalytics: number;
  conversionStabilityAnalytics: number;
  aestheticPracticalityAnalytics: number;
  harmonyAnalytics: number;
  continuityAnalytics: number;
  inflationGuardAnalytics: number;
  trustDominanceAnalytics: number;
  contradictionAnalytics: number;
  replayIntegrityAnalytics: number;
  topDriftCount: number;
};

export type AdaptiveStrategicRankingMonitoring = {
  strategicInstability: boolean;
  contradictionRisk: boolean;
  inflationRisk: boolean;
  trustDominanceRisk: boolean;
  replayIntegrityValid: boolean;
  continuityValid: boolean;
  crossBalanceValid: boolean;
  upstreamStable: boolean;
};

export type AdaptiveStrategicRankingMeta = {
  version: "adaptive-strategic-ranking-v1";
  strategicRankingActive: boolean;
  strategicRankingProfile: AdaptiveStrategicRankingMode;
  strategicRankingScore: number;
  strategicRankingDelta: number;
  strategicRankingConfidence: number;
  trustValueBalance: number;
  premiumAffordabilityBalance: number;
  conversionStabilityBalance: number;
  aestheticPracticalityBalance: number;
  rankingContinuity: number;
  inflationGuardActive: boolean;
  trustDominanceGuardActive: boolean;
  contradictionCount: number;
  routingLane: StrategicRankingRoutingLane | string;
  rollbackTriggered: boolean;
  strategicWarnings: string[];
  strategicAnomalies: string[];
  analytics: AdaptiveStrategicRankingAnalytics;
  monitoring: AdaptiveStrategicRankingMonitoring;
  mutationApplied: boolean;
  signalHash: string;
  graphExecutionHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildStrategicRankingAnalytics(args: {
  signals: StrategicRankingSignalBundle;
  influence: StrategicRankingBlendInfluence;
  guards: StrategicRankingGuards;
  contradictions: StrategicRankingContradictionResult;
  replayIntegrity: number;
  topDrift: number;
}): AdaptiveStrategicRankingAnalytics {
  const { signals, influence, guards, contradictions, replayIntegrity, topDrift } = args;
  return {
    trustValueAnalytics: clampScore(signals.trustValueBalance * 100 + influence.trustInfluence * 15),
    premiumAffordabilityAnalytics: clampScore(signals.premiumAffordabilityBalance * 100 + influence.premiumInfluence * 15),
    conversionStabilityAnalytics: clampScore(signals.conversionStabilityBalance * 100 + influence.conversionInfluence * 20),
    aestheticPracticalityAnalytics: clampScore(signals.aestheticPracticalityBalance * 100 + influence.aestheticInfluence * 15),
    harmonyAnalytics: clampScore(signals.strategicHarmony * 100),
    continuityAnalytics: clampScore(influence.continuityStrength * 100),
    inflationGuardAnalytics: clampScore(guards.inflationScore * 100),
    trustDominanceAnalytics: clampScore(guards.trustDominanceScore * 100),
    contradictionAnalytics: clampScore(contradictions.uncertaintyScore * 100),
    replayIntegrityAnalytics: replayIntegrity,
    topDriftCount: topDrift,
  };
}

export function buildStrategicRankingMonitoring(args: {
  influence: StrategicRankingBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: StrategicRankingBalanceResult;
  guards: StrategicRankingGuards;
  contradictions: StrategicRankingContradictionResult;
  signals: StrategicRankingSignalBundle;
  topDrift: number;
  profile: AdaptiveStrategicRankingProfile;
}): AdaptiveStrategicRankingMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, guards, contradictions, signals, topDrift, profile } = args;
  return {
    strategicInstability: rollbackTriggered || !balance.multiObjectiveStable,
    contradictionRisk: contradictions.contradictionCount >= 2,
    inflationRisk: guards.inflationGuardActive,
    trustDominanceRisk: guards.trustDominanceGuardActive,
    replayIntegrityValid: replayIntegrity >= 70,
    continuityValid: influence.continuityStrength <= profile.maxDelta,
    crossBalanceValid: influence.strategicRankingDelta <= profile.maxDelta,
    upstreamStable: balance.multiObjectiveStable,
  };
}

/**
 * P6.2 — Multi-objective commerce telemetry (meta.multiObjectiveCommerce).
 */

import type { MultiObjectiveBalanceResult, MultiObjectiveBlendInfluence } from "@/lib/multiObjective/multiObjectiveBalancer";
import type { MultiObjectiveContradictionResult } from "@/lib/multiObjective/multiObjectiveContradictions";
import type { MultiObjectiveCommerceMode, MultiObjectiveRoutingLane } from "@/lib/multiObjective/multiObjectiveFlags";
import type { MultiObjectiveCommerceProfile } from "@/lib/multiObjective/multiObjectiveProfiles";
import type { MultiObjectiveSignalBundle } from "@/lib/multiObjective/multiObjectiveConfidence";

export type MultiObjectiveCommerceAnalytics = {
  qualityAnalytics: number;
  priceAnalytics: number;
  trustAnalytics: number;
  valueAnalytics: number;
  intentAnalytics: number;
  aestheticAnalytics: number;
  stabilityAnalytics: number;
  conversionAnalytics: number;
  objectiveBalanceAnalytics: number;
  contradictionAnalytics: number;
  continuityAnalytics: number;
  replayIntegrityAnalytics: number;
  topDriftCount: number;
};

export type MultiObjectiveCommerceMonitoring = {
  objectiveInstability: boolean;
  contradictionRisk: boolean;
  conversionInflation: boolean;
  priceQualityTension: boolean;
  replayIntegrityValid: boolean;
  continuityValid: boolean;
  crossObjectiveBalanceValid: boolean;
  upstreamStable: boolean;
};

export type MultiObjectiveCommerceMeta = {
  version: "multi-objective-commerce-v1";
  multiObjectiveActive: boolean;
  multiObjectiveProfile: MultiObjectiveCommerceMode;
  multiObjectiveScore: number;
  multiObjectiveDelta: number;
  multiObjectiveConfidence: number;
  qualityObjective: number;
  priceObjective: number;
  trustObjective: number;
  valueObjective: number;
  intentObjective: number;
  aestheticObjective: number;
  stabilityObjective: number;
  conversionObjective: number;
  contradictionCount: number;
  routingLane: MultiObjectiveRoutingLane | string;
  rollbackTriggered: boolean;
  objectiveWarnings: string[];
  objectiveAnomalies: string[];
  analytics: MultiObjectiveCommerceAnalytics;
  monitoring: MultiObjectiveCommerceMonitoring;
  mutationApplied: boolean;
  signalHash: string;
  graphExecutionHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildMultiObjectiveAnalytics(args: {
  signals: MultiObjectiveSignalBundle;
  influence: MultiObjectiveBlendInfluence;
  contradictions: MultiObjectiveContradictionResult;
  replayIntegrity: number;
  topDrift: number;
}): MultiObjectiveCommerceAnalytics {
  const { signals, influence, contradictions, replayIntegrity, topDrift } = args;
  return {
    qualityAnalytics: clampScore(signals.qualityObjective * 100 + influence.qualityInfluence * 15),
    priceAnalytics: clampScore(signals.priceObjective * 100 + influence.priceInfluence * 15),
    trustAnalytics: clampScore(signals.trustObjective * 100 + influence.trustInfluence * 20),
    valueAnalytics: clampScore(signals.valueObjective * 100 + influence.valueInfluence * 15),
    intentAnalytics: clampScore(signals.intentObjective * 100 + influence.intentInfluence * 15),
    aestheticAnalytics: clampScore(signals.aestheticObjective * 100 + influence.aestheticInfluence * 15),
    stabilityAnalytics: clampScore(signals.stabilityObjective * 100 + influence.stabilityInfluence * 20),
    conversionAnalytics: clampScore(signals.conversionObjective * 100 + influence.conversionInfluence * 20),
    objectiveBalanceAnalytics: clampScore(signals.objectiveBalance * 100),
    contradictionAnalytics: clampScore(contradictions.uncertaintyScore * 100),
    continuityAnalytics: clampScore(influence.continuityStrength * 100),
    replayIntegrityAnalytics: replayIntegrity,
    topDriftCount: topDrift,
  };
}

export function buildMultiObjectiveMonitoring(args: {
  influence: MultiObjectiveBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: MultiObjectiveBalanceResult;
  contradictions: MultiObjectiveContradictionResult;
  signals: MultiObjectiveSignalBundle;
  topDrift: number;
  profile: MultiObjectiveCommerceProfile;
}): MultiObjectiveCommerceMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, contradictions, signals, topDrift, profile } = args;
  return {
    objectiveInstability: rollbackTriggered || !balance.intentStable,
    contradictionRisk: contradictions.contradictionCount >= 2,
    conversionInflation: balance.multiObjectiveConfidence > 0.95 && influence.multiObjectiveDelta > profile.maxDelta * 0.8,
    priceQualityTension: signals.priceObjective >= 0.55 && signals.qualityObjective < 0.35,
    replayIntegrityValid: replayIntegrity >= 70,
    continuityValid: influence.continuityStrength <= profile.maxDelta,
    crossObjectiveBalanceValid: influence.multiObjectiveDelta <= profile.maxDelta,
    upstreamStable: balance.intentStable,
  };
}

/**
 * P6.0 — Cognition engine telemetry (analytics + monitoring).
 */

import type { CognitionBalanceResult, CognitionBlendInfluence } from "@/lib/cognition/cognitionBalancer";
import type { CognitionContradictionResult } from "@/lib/cognition/cognitionContradictions";
import type { CognitionEngineMode, CognitionRoutingLane } from "@/lib/cognition/cognitionFlags";
import type { CognitionProfile } from "@/lib/cognition/cognitionProfiles";
import type { UnifiedCommerceState } from "@/lib/cognition/cognitionFusion";

export type CognitionEngineAnalytics = {
  reasoningFusionAnalytics: number;
  strategyFusionAnalytics: number;
  marketStateAnalytics: number;
  behavioralReadinessAnalytics: number;
  trustValueAnalytics: number;
  conversionProbabilityAnalytics: number;
  contradictionAnalytics: number;
  rankingContinuityAnalytics: number;
  replayIntegrityAnalytics: number;
  topDriftCount: number;
};

export type CognitionMonitoring = {
  cognitionInstability: boolean;
  contradictionRisk: boolean;
  conversionInflation: boolean;
  behavioralConflict: boolean;
  replayIntegrityValid: boolean;
  rankingContinuityValid: boolean;
  crossLayerBalanceValid: boolean;
  graphIntegrityValid: boolean;
};

export type CognitionEngineMeta = {
  version: "cognition-engine-v1";
  cognitionActive: boolean;
  cognitionProfile: CognitionEngineMode;
  cognitionScore: number;
  cognitionDelta: number;
  cognitionConfidence: number;
  cognitionStability: number;
  reasoningFusion: number;
  strategyFusion: number;
  marketStateFusion: number;
  behavioralReadinessFusion: number;
  trustValueBalance: number;
  conversionProbability: number;
  contradictionCount: number;
  routingLane: CognitionRoutingLane | string;
  rollbackTriggered: boolean;
  cognitionWarnings: string[];
  cognitionAnomalies: string[];
  analytics: CognitionEngineAnalytics;
  monitoring: CognitionMonitoring;
  mutationApplied: boolean;
  graphExecutionHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildCognitionAnalytics(args: {
  state: UnifiedCommerceState;
  influence: CognitionBlendInfluence;
  contradictions: CognitionContradictionResult;
  replayIntegrity: number;
  topDrift: number;
}): CognitionEngineAnalytics {
  const { state, influence, contradictions, replayIntegrity, topDrift } = args;
  return {
    reasoningFusionAnalytics: clampScore(state.reasoningFusion * 100),
    strategyFusionAnalytics: clampScore(state.strategyFusion * 100),
    marketStateAnalytics: clampScore(state.marketStateFusion * 100),
    behavioralReadinessAnalytics: clampScore(state.behavioralReadinessFusion * 100 + influence.behavioralInfluence * 15),
    trustValueAnalytics: clampScore(state.trustValueBalance * 100 + influence.trustValueInfluence * 20),
    conversionProbabilityAnalytics: clampScore(state.conversionProbability * 100 + influence.conversionInfluence * 20),
    contradictionAnalytics: clampScore(contradictions.contradictionSeverity * 100),
    rankingContinuityAnalytics: clampScore(influence.continuityStrength * 100),
    replayIntegrityAnalytics: replayIntegrity,
    topDriftCount: topDrift,
  };
}

export function buildCognitionMonitoring(args: {
  influence: CognitionBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: CognitionBalanceResult;
  contradictions: CognitionContradictionResult;
  topDrift: number;
  profile: CognitionProfile;
  graphIntegrity: number;
}): CognitionMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, contradictions, topDrift, profile, graphIntegrity } =
    args;
  return {
    cognitionInstability: rollbackTriggered || !balance.behavioralStable || !balance.marketStable,
    contradictionRisk: contradictions.contradictionCount >= 2,
    conversionInflation: balance.cognitionConfidence > 0.95 && influence.cognitionDelta > profile.maxDelta * 0.8,
    behavioralConflict: contradictions.contradictions.some((c) => c.includes("hesitation") || c.includes("friction")),
    replayIntegrityValid: replayIntegrity >= 70,
    rankingContinuityValid: influence.continuityStrength <= profile.maxDelta,
    crossLayerBalanceValid: influence.cognitionDelta <= profile.maxDelta,
    graphIntegrityValid: graphIntegrity >= 40,
  };
}

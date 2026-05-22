/**
 * P6.1 — Intent cognition telemetry (meta.intentCognition).
 */

import type { IntentBalanceResult, IntentBlendInfluence } from "@/lib/intent/intentBalancer";
import type { IntentContradictionResult } from "@/lib/intent/intentContradictions";
import type { IntentCognitionMode, IntentCognitionRoutingLane } from "@/lib/intent/intentFlags";
import type { IntentCognitionProfile } from "@/lib/intent/intentProfiles";
import type { IntentSignalBundle } from "@/lib/intent/intentConfidence";

export type IntentCognitionAnalytics = {
  recommendationAnalytics: number;
  comparisonAnalytics: number;
  premiumAnalytics: number;
  valueAnalytics: number;
  trustAnalytics: number;
  readinessAnalytics: number;
  emotionalAnalytics: number;
  aestheticAnalytics: number;
  explorationAnalytics: number;
  contradictionAnalytics: number;
  continuityAnalytics: number;
  replayIntegrityAnalytics: number;
  topDriftCount: number;
};

export type IntentCognitionMonitoring = {
  intentInstability: boolean;
  contradictionRisk: boolean;
  readinessInflation: boolean;
  emotionalConflict: boolean;
  replayIntegrityValid: boolean;
  continuityValid: boolean;
  crossIntentBalanceValid: boolean;
  upstreamStable: boolean;
};

export type IntentCognitionMeta = {
  version: "intent-cognition-v1";
  intentActive: boolean;
  intentProfile: IntentCognitionMode;
  intentScore: number;
  intentDelta: number;
  intentConfidence: number;
  recommendationIntent: number;
  comparisonIntent: number;
  premiumIntent: number;
  valueIntent: number;
  trustIntent: number;
  readinessIntent: number;
  hesitationIntent: number;
  emotionalIntent: number;
  aestheticIntent: number;
  explorationIntent: number;
  contradictionCount: number;
  routingLane: IntentCognitionRoutingLane | string;
  rollbackTriggered: boolean;
  intentWarnings: string[];
  intentAnomalies: string[];
  analytics: IntentCognitionAnalytics;
  monitoring: IntentCognitionMonitoring;
  mutationApplied: boolean;
  signalHash: string;
  graphExecutionHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildIntentAnalytics(args: {
  signals: IntentSignalBundle;
  influence: IntentBlendInfluence;
  contradictions: IntentContradictionResult;
  replayIntegrity: number;
  topDrift: number;
}): IntentCognitionAnalytics {
  const { signals, influence, contradictions, replayIntegrity, topDrift } = args;
  return {
    recommendationAnalytics: clampScore(signals.recommendationIntent * 100 + influence.recommendationInfluence * 15),
    comparisonAnalytics: clampScore(signals.comparisonIntent * 100 + influence.comparisonInfluence * 15),
    premiumAnalytics: clampScore(signals.premiumIntent * 100),
    valueAnalytics: clampScore(signals.valueIntent * 100),
    trustAnalytics: clampScore(signals.trustIntent * 100 + influence.trustInfluence * 20),
    readinessAnalytics: clampScore(signals.readinessIntent * 100 + influence.readinessInfluence * 20),
    emotionalAnalytics: clampScore(signals.emotionalIntent * 100),
    aestheticAnalytics: clampScore(signals.aestheticIntent * 100 + influence.aestheticInfluence * 15),
    explorationAnalytics: clampScore(signals.explorationIntent * 100),
    contradictionAnalytics: clampScore(contradictions.uncertaintyScore * 100),
    continuityAnalytics: clampScore(influence.continuityStrength * 100),
    replayIntegrityAnalytics: replayIntegrity,
    topDriftCount: topDrift,
  };
}

export function buildIntentMonitoring(args: {
  influence: IntentBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: IntentBalanceResult;
  contradictions: IntentContradictionResult;
  signals: IntentSignalBundle;
  topDrift: number;
  profile: IntentCognitionProfile;
}): IntentCognitionMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, contradictions, signals, topDrift, profile } = args;
  return {
    intentInstability: rollbackTriggered || !balance.cognitionStable,
    contradictionRisk: contradictions.contradictionCount >= 2,
    readinessInflation: balance.intentConfidence > 0.95 && influence.intentDelta > profile.maxDelta * 0.8,
    emotionalConflict: signals.emotionalIntent >= 0.55 && signals.hesitationIntent >= 0.55,
    replayIntegrityValid: replayIntegrity >= 70,
    continuityValid: influence.continuityStrength <= profile.maxDelta,
    crossIntentBalanceValid: influence.intentDelta <= profile.maxDelta,
    upstreamStable: balance.cognitionStable,
  };
}

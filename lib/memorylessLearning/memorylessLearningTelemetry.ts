/**
 * P6.4 — Memoryless commerce learning telemetry (meta.memorylessCommerceLearning).
 */

import type { MemorylessLearningBalanceResult, MemorylessLearningBlendInfluence } from "@/lib/memorylessLearning/memorylessLearningBalancer";
import type { MemorylessLearningContradictionResult } from "@/lib/memorylessLearning/memorylessLearningContradictions";
import type { MemorylessLearningDetection } from "@/lib/memorylessLearning/memorylessLearningDetection";
import type { MemorylessCommerceLearningMode, MemorylessLearningRoutingLane } from "@/lib/memorylessLearning/memorylessLearningFlags";
import type { MemorylessCommerceLearningProfile } from "@/lib/memorylessLearning/memorylessLearningProfiles";
import type { MemorylessLearningSignalBundle } from "@/lib/memorylessLearning/memorylessLearningConfidence";

export type MemorylessCommerceLearningAnalytics = {
  driftAnalytics: number;
  fatigueAnalytics: number;
  confidenceAnalytics: number;
  oscillationAnalytics: number;
  trustAnalytics: number;
  conversionAnalytics: number;
  continuityAnalytics: number;
  stabilityAnalytics: number;
  harmonyAnalytics: number;
  contradictionAnalytics: number;
  replayIntegrityAnalytics: number;
  topDriftCount: number;
};

export type MemorylessCommerceLearningMonitoring = {
  learningInstability: boolean;
  contradictionRisk: boolean;
  driftRisk: boolean;
  fatigueRisk: boolean;
  replayIntegrityValid: boolean;
  continuityValid: boolean;
  crossLearningBalanceValid: boolean;
  upstreamStable: boolean;
};

export type MemorylessCommerceLearningMeta = {
  version: "memoryless-commerce-learning-v1";
  learningActive: boolean;
  learningProfile: MemorylessCommerceLearningMode;
  learningScore: number;
  learningDelta: number;
  learningConfidence: number;
  rankingDriftDetected: boolean;
  signalFatigueDetected: boolean;
  lowConfidencePatternDetected: boolean;
  strategicOscillationDetected: boolean;
  trustDegradationDetected: boolean;
  conversionInstabilityDetected: boolean;
  rankingDriftScore: number;
  signalFatigueScore: number;
  continuityReinforcement: number;
  contradictionCount: number;
  routingLane: MemorylessLearningRoutingLane | string;
  rollbackTriggered: boolean;
  learningWarnings: string[];
  learningAnomalies: string[];
  analytics: MemorylessCommerceLearningAnalytics;
  monitoring: MemorylessCommerceLearningMonitoring;
  mutationApplied: boolean;
  signalHash: string;
  graphExecutionHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildMemorylessLearningAnalytics(args: {
  signals: MemorylessLearningSignalBundle;
  influence: MemorylessLearningBlendInfluence;
  detection: MemorylessLearningDetection;
  contradictions: MemorylessLearningContradictionResult;
  replayIntegrity: number;
  topDrift: number;
}): MemorylessCommerceLearningAnalytics {
  const { signals, influence, detection, contradictions, replayIntegrity, topDrift } = args;
  return {
    driftAnalytics: clampScore(signals.rankingDriftScore * 100 + influence.driftDampening * 10),
    fatigueAnalytics: clampScore(signals.signalFatigueScore * 100 + influence.fatigueDampening * 10),
    confidenceAnalytics: clampScore((1 - signals.lowConfidenceScore) * 100),
    oscillationAnalytics: clampScore(signals.oscillationScore * 100),
    trustAnalytics: clampScore((1 - signals.trustDegradationScore) * 100 + influence.trustStabilization * 15),
    conversionAnalytics: clampScore((1 - signals.conversionInstabilityScore) * 100 + influence.conversionStabilization * 15),
    continuityAnalytics: clampScore(influence.continuityInfluence * 100),
    stabilityAnalytics: clampScore(signals.rankingStabilityScore * 100 + influence.stabilizationInfluence * 15),
    harmonyAnalytics: clampScore(signals.learningHarmony * 100),
    contradictionAnalytics: clampScore(contradictions.uncertaintyScore * 100),
    replayIntegrityAnalytics: replayIntegrity,
    topDriftCount: topDrift,
  };
}

export function buildMemorylessLearningMonitoring(args: {
  influence: MemorylessLearningBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: MemorylessLearningBalanceResult;
  detection: MemorylessLearningDetection;
  contradictions: MemorylessLearningContradictionResult;
  topDrift: number;
  profile: MemorylessCommerceLearningProfile;
}): MemorylessCommerceLearningMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, detection, contradictions, topDrift, profile } = args;
  return {
    learningInstability: rollbackTriggered || !balance.strategicStable,
    contradictionRisk: contradictions.contradictionCount >= 2,
    driftRisk: detection.rankingDriftDetected,
    fatigueRisk: detection.signalFatigueDetected,
    replayIntegrityValid: replayIntegrity >= 70,
    continuityValid: influence.continuityInfluence <= profile.maxContinuityAmplification,
    crossLearningBalanceValid: influence.learningDelta <= profile.maxDelta,
    upstreamStable: balance.strategicStable,
  };
}

/**
 * P6.4 — Memoryless learning confidence + signal bundle.
 */

import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { MemorylessLearningContradictionResult } from "@/lib/memorylessLearning/memorylessLearningContradictions";
import type { MemorylessLearningDetection } from "@/lib/memorylessLearning/memorylessLearningDetection";
import type { UnifiedMemorylessLearningState } from "@/lib/memorylessLearning/memorylessLearningFusion";

export type MemorylessLearningSignalBundle = {
  rankingDriftScore: number;
  signalFatigueScore: number;
  lowConfidenceScore: number;
  oscillationScore: number;
  trustDegradationScore: number;
  conversionInstabilityScore: number;
  continuityReinforcement: number;
  rankingStabilityScore: number;
  learningHarmony: number;
  signalHash: string;
  graphExecutionHash: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function buildMemorylessLearningSignalBundle(state: UnifiedMemorylessLearningState): MemorylessLearningSignalBundle {
  const core = {
    rankingDriftScore: state.rankingDriftScore,
    signalFatigueScore: state.signalFatigueScore,
    lowConfidenceScore: state.lowConfidenceScore,
    oscillationScore: state.oscillationScore,
    trustDegradationScore: state.trustDegradationScore,
    conversionInstabilityScore: state.conversionInstabilityScore,
    continuityReinforcement: state.continuityReinforcement,
    rankingStabilityScore: state.rankingStabilityScore,
    learningHarmony: state.learningHarmony,
  };

  const signalHash = Object.entries(core)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(Number(v) * 1000)}`)
    .join("|");

  const graphExecutionHash = [
    `drift:${core.rankingDriftScore}`,
    `fatigue:${core.signalFatigueScore}`,
    `cont:${core.continuityReinforcement}`,
    `harm:${core.learningHarmony}`,
  ].join(",");

  return { ...core, signalHash, graphExecutionHash };
}

export function computeMemorylessLearningConfidence(args: {
  signals: MemorylessLearningSignalBundle;
  multiObjective: MultiObjectiveCommerceMeta;
  strategic: AdaptiveStrategicRankingMeta;
  detection: MemorylessLearningDetection;
  contradictions: MemorylessLearningContradictionResult;
  governanceDampen: number;
}): number {
  const { signals, multiObjective, strategic, detection, contradictions, governanceDampen } = args;

  const signalConfidence = clamp(
    signals.learningHarmony * 0.22 +
      signals.rankingStabilityScore * 0.18 +
      signals.continuityReinforcement * 0.15 +
      (strategic.strategicRankingConfidence ?? 0) * 0.12 +
      (multiObjective.multiObjectiveConfidence ?? 0) * 0.1 -
      signals.signalFatigueScore * 0.08 -
      (detection.rankingDriftDetected ? 0.05 : 0),
    0,
    1
  );

  return round3(clamp((signalConfidence - contradictions.uncertaintyScore * 0.1) * governanceDampen, 0, 1));
}

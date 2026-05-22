/**
 * P6.4 — Unified memoryless learning state synthesis.
 */

import type { MemorylessLearningDetection } from "@/lib/memorylessLearning/memorylessLearningDetection";
import type { MemorylessLearningStabilization } from "@/lib/memorylessLearning/memorylessLearningStabilization";

export type UnifiedMemorylessLearningState = {
  rankingDriftScore: number;
  signalFatigueScore: number;
  lowConfidenceScore: number;
  oscillationScore: number;
  trustDegradationScore: number;
  conversionInstabilityScore: number;
  continuityReinforcement: number;
  rankingStabilityScore: number;
  learningHarmony: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function synthesizeUnifiedMemorylessLearningState(args: {
  detection: MemorylessLearningDetection;
  stabilization: MemorylessLearningStabilization;
}): UnifiedMemorylessLearningState {
  const riskScores = [
    args.detection.rankingDriftScore,
    args.detection.signalFatigueScore,
    args.detection.lowConfidenceScore,
    args.detection.oscillationScore,
    args.detection.trustDegradationScore,
    args.detection.conversionInstabilityScore,
  ];
  const meanRisk = riskScores.reduce((s, v) => s + v, 0) / riskScores.length;
  const learningHarmony = round3(clamp(args.stabilization.rankingStabilityScore * 0.6 + (1 - meanRisk) * 0.4, 0, 1));

  return {
    rankingDriftScore: args.detection.rankingDriftScore,
    signalFatigueScore: args.detection.signalFatigueScore,
    lowConfidenceScore: args.detection.lowConfidenceScore,
    oscillationScore: args.detection.oscillationScore,
    trustDegradationScore: args.detection.trustDegradationScore,
    conversionInstabilityScore: args.detection.conversionInstabilityScore,
    continuityReinforcement: args.stabilization.continuityReinforcement,
    rankingStabilityScore: args.stabilization.rankingStabilityScore,
    learningHarmony,
  };
}

/**
 * P6.4 — Memoryless learning contradiction detection.
 */

import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { MemorylessLearningDetection } from "@/lib/memorylessLearning/memorylessLearningDetection";
import type { UnifiedMemorylessLearningState } from "@/lib/memorylessLearning/memorylessLearningFusion";

export type MemorylessLearningContradictionResult = {
  contradictionCount: number;
  contradictions: string[];
  uncertaintyScore: number;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function detectMemorylessLearningContradictions(args: {
  state: UnifiedMemorylessLearningState;
  detection: MemorylessLearningDetection;
  strategic: AdaptiveStrategicRankingMeta;
}): MemorylessLearningContradictionResult {
  const { state, detection, strategic } = args;
  const contradictions: string[] = [];

  if (detection.rankingDriftDetected && state.continuityReinforcement >= 0.6) contradictions.push("drift_continuity_conflict");
  if (detection.signalFatigueDetected && detection.lowConfidencePatternDetected) contradictions.push("fatigue_confidence_conflict");
  if (detection.strategicOscillationDetected && state.rankingStabilityScore >= 0.55) contradictions.push("oscillation_stability_conflict");
  if (detection.trustDegradationDetected && detection.conversionInstabilityDetected) contradictions.push("trust_conversion_conflict");
  if (strategic.rollbackTriggered) contradictions.push("strategic_rollback");
  if (strategic.contradictionCount >= 2) contradictions.push("strategic_upstream_conflict");
  if (state.learningHarmony < 0.35) contradictions.push("learning_imbalance");

  const uncertaintyScore = round3(
    Math.min(1, contradictions.length * 0.1 + (1 - state.learningHarmony) * 0.2 + strategic.contradictionCount * 0.05)
  );

  return {
    contradictionCount: contradictions.length,
    contradictions: contradictions.slice(0, 8),
    uncertaintyScore,
  };
}

/**
 * P6.4 — Continuity reinforcement + ranking stabilization (memoryless; aggregate telemetry only).
 */

import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { MemorylessLearningDetection } from "@/lib/memorylessLearning/memorylessLearningDetection";

export type MemorylessLearningStabilization = {
  continuityReinforcement: number;
  rankingStabilityScore: number;
  integrityPatternStrength: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeMemorylessLearningStabilization(args: {
  multiObjective: MultiObjectiveCommerceMeta;
  strategic: AdaptiveStrategicRankingMeta;
  detection: MemorylessLearningDetection;
}): MemorylessLearningStabilization {
  const { multiObjective, strategic, detection } = args;

  const continuityReinforcement = round3(
    clamp(
      (strategic.rankingContinuity ?? 0) * 0.35 +
        (multiObjective.analytics?.continuityAnalytics ?? 0) * 0.01 * 0.25 +
        (strategic.analytics?.replayIntegrityAnalytics ?? 0) * 0.01 * 0.25 +
        (multiObjective.analytics?.replayIntegrityAnalytics ?? 0) * 0.01 * 0.15 -
        detection.rankingDriftScore * 0.15,
      0,
      1
    )
  );

  const integrityPatternStrength = round3(
    clamp(
      (strategic.analytics?.replayIntegrityAnalytics ?? 0) * 0.01 * 0.5 +
        (multiObjective.analytics?.replayIntegrityAnalytics ?? 0) * 0.01 * 0.3 +
        continuityReinforcement * 0.2,
      0,
      1
    )
  );

  const rankingStabilityScore = round3(
    clamp(
      continuityReinforcement * 0.45 +
        integrityPatternStrength * 0.35 +
        (1 - detection.oscillationScore) * 0.2 -
        detection.signalFatigueScore * 0.1,
      0,
      1
    )
  );

  return { continuityReinforcement, rankingStabilityScore, integrityPatternStrength };
}

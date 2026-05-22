/**
 * P6.4 — Aggregate telemetry detection (no user memory; single-request deterministic signals).
 */

import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";

export type MemorylessLearningDetection = {
  rankingDriftDetected: boolean;
  signalFatigueDetected: boolean;
  lowConfidencePatternDetected: boolean;
  strategicOscillationDetected: boolean;
  trustDegradationDetected: boolean;
  conversionInstabilityDetected: boolean;
  rankingDriftScore: number;
  signalFatigueScore: number;
  lowConfidenceScore: number;
  oscillationScore: number;
  trustDegradationScore: number;
  conversionInstabilityScore: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function detectMemorylessLearningSignals(args: {
  intent: IntentCognitionMeta;
  multiObjective: MultiObjectiveCommerceMeta;
  strategic: AdaptiveStrategicRankingMeta;
}): MemorylessLearningDetection {
  const { intent, multiObjective, strategic } = args;

  const rankingDriftScore = round3(
    clamp(
      (strategic.analytics?.topDriftCount ?? 0) * 0.15 +
        Math.abs((strategic.strategicRankingDelta ?? 0) - (multiObjective.multiObjectiveDelta ?? 0)) * 0.35 +
        Math.abs((multiObjective.multiObjectiveDelta ?? 0) - (intent.intentDelta ?? 0)) * 0.25,
      0,
      1
    )
  );
  const rankingDriftDetected = rankingDriftScore >= 0.3 || (strategic.analytics?.topDriftCount ?? 0) > 0;

  const confidences = [intent.intentConfidence ?? 0, multiObjective.multiObjectiveConfidence ?? 0, strategic.strategicRankingConfidence ?? 0];
  const lowCount = confidences.filter((c) => c < 0.35).length;
  const signalFatigueScore = round3(clamp(lowCount / 3 + (1 - (strategic.strategicRankingConfidence ?? 0)) * 0.25, 0, 1));
  const signalFatigueDetected = lowCount >= 2 || signalFatigueScore >= 0.55;

  const lowConfidenceScore = round3(clamp(confidences.reduce((s, c) => s + (c < 0.4 ? 0.33 : 0), 0), 0, 1));
  const lowConfidencePatternDetected = lowCount >= 2 || confidences.every((c) => c < 0.45);

  const balances = [
    strategic.trustValueBalance ?? 0,
    strategic.premiumAffordabilityBalance ?? 0,
    strategic.conversionStabilityBalance ?? 0,
    strategic.aestheticPracticalityBalance ?? 0,
  ];
  const mean = balances.reduce((s, v) => s + v, 0) / balances.length;
  const variance = balances.reduce((s, v) => s + (v - mean) ** 2, 0) / balances.length;
  const oscillationScore = round3(clamp(Math.sqrt(variance) + (1 - (strategic.analytics?.harmonyAnalytics ?? 50) * 0.01) * 0.3, 0, 1));
  const strategicOscillationDetected = oscillationScore >= 0.45 || Math.min(...balances) < 0.3;

  const trustDegradationScore = round3(
    clamp(
      ((intent.trustIntent ?? 0) - (multiObjective.trustObjective ?? 0)) * 0.3 +
        (strategic.trustDominanceGuardActive ? 0.25 : 0) +
        ((multiObjective.trustObjective ?? 0) < 0.25 ? 0.2 : 0),
      0,
      1
    )
  );
  const trustDegradationDetected = trustDegradationScore >= 0.35 || strategic.trustDominanceGuardActive;

  const conversionInstabilityScore = round3(
    clamp(
      (1 - (strategic.conversionStabilityBalance ?? 0)) * 0.45 +
        ((multiObjective.conversionObjective ?? 0) > 0.55 && (strategic.rankingContinuity ?? 0) < 0.45 ? 0.25 : 0) +
        (strategic.inflationGuardActive ? 0.15 : 0),
      0,
      1
    )
  );
  const conversionInstabilityDetected = conversionInstabilityScore >= 0.4 || strategic.conversionStabilityBalance < 0.35;

  return {
    rankingDriftDetected,
    signalFatigueDetected,
    lowConfidencePatternDetected,
    strategicOscillationDetected,
    trustDegradationDetected,
    conversionInstabilityDetected,
    rankingDriftScore,
    signalFatigueScore,
    lowConfidenceScore,
    oscillationScore,
    trustDegradationScore,
    conversionInstabilityScore,
  };
}

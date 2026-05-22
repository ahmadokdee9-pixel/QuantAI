/**
 * P6.4 — Memoryless learning balancer (routing + bounded influence).
 */

import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { MemorylessLearningContradictionResult } from "@/lib/memorylessLearning/memorylessLearningContradictions";
import type { MemorylessLearningDetection } from "@/lib/memorylessLearning/memorylessLearningDetection";
import type { MemorylessLearningSignalBundle } from "@/lib/memorylessLearning/memorylessLearningConfidence";
import type { MemorylessLearningRoutingLane } from "@/lib/memorylessLearning/memorylessLearningFlags";
import type { MemorylessCommerceLearningProfile } from "@/lib/memorylessLearning/memorylessLearningProfiles";

export type MemorylessLearningBalanceResult = {
  routingLane: MemorylessLearningRoutingLane;
  governanceDampen: number;
  strategicStable: boolean;
  balanceScore: number;
  learningConfidence: number;
};

export type MemorylessLearningBlendInfluence = {
  learningDelta: number;
  continuityInfluence: number;
  stabilizationInfluence: number;
  driftDampening: number;
  fatigueDampening: number;
  trustStabilization: number;
  conversionStabilization: number;
  integrityReinforcement: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveMemorylessLearningRoutingLane(args: {
  signals: MemorylessLearningSignalBundle;
  detection: MemorylessLearningDetection;
  contradictions: MemorylessLearningContradictionResult;
  strategic: AdaptiveStrategicRankingMeta;
  governance: IntentGovernanceMeta;
}): MemorylessLearningRoutingLane {
  const { signals, detection, contradictions, strategic, governance } = args;

  if (governance.anomalyDetected || strategic.rollbackTriggered) return "stabilize";
  if (strategic.routingLane === "replay-protect") return "replay-protect";
  if (detection.rankingDriftDetected) return "drift-check";
  if (detection.signalFatigueDetected) return "fatigue-check";
  if (detection.lowConfidencePatternDetected) return "confidence-check";
  if (detection.strategicOscillationDetected) return "oscillation-check";
  if (detection.trustDegradationDetected) return "trust-check";
  if (detection.conversionInstabilityDetected) return "conversion-check";
  if (contradictions.contradictionCount >= 2) return "stabilize";
  if (strategic.routingLane === "reinforce") return "reinforce";
  if (signals.learningHarmony >= 0.55 && signals.continuityReinforcement >= 0.5) return "continuity-safe";
  return "hold";
}

export function computeMemorylessLearningBalance(args: {
  signals: MemorylessLearningSignalBundle;
  learningConfidence: number;
  governance: IntentGovernanceMeta;
  strategic: AdaptiveStrategicRankingMeta;
  detection: MemorylessLearningDetection;
  contradictions: MemorylessLearningContradictionResult;
  profile: MemorylessCommerceLearningProfile;
}): MemorylessLearningBalanceResult {
  const { signals, learningConfidence, governance, strategic, detection, contradictions, profile } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;
  if (detection.signalFatigueDetected) governanceDampen *= 0.92;
  if (detection.rankingDriftDetected) governanceDampen *= 0.94;

  const strategicStable =
    !strategic.rollbackTriggered &&
    (strategic.analytics?.replayIntegrityAnalytics ?? 0) >= 50 &&
    !detection.strategicOscillationDetected;

  let routingLane = resolveMemorylessLearningRoutingLane({ signals, detection, contradictions, strategic, governance });

  if (!profile.allowsMutation && routingLane !== "replay-protect" && routingLane !== "stabilize") {
    routingLane = "hold";
  }

  const balanceScore = Math.min(
    100,
    Math.round(learningConfidence * 40 + signals.learningHarmony * 25 + signals.rankingStabilityScore * 15 + (strategic.strategicRankingScore ?? 0) * 0.1)
  );

  return { routingLane, governanceDampen, strategicStable, balanceScore, learningConfidence };
}

export function computeMemorylessLearningBlendInfluence(args: {
  signals: MemorylessLearningSignalBundle;
  detection: MemorylessLearningDetection;
  balance: MemorylessLearningBalanceResult;
  profile: MemorylessCommerceLearningProfile;
}): MemorylessLearningBlendInfluence {
  const { signals, detection, balance, profile } = args;
  const damp = balance.governanceDampen;

  const continuityInfluence = clamp(signals.continuityReinforcement * profile.maxContinuityAmplification * damp, 0, profile.maxContinuityAmplification);
  const stabilizationInfluence = clamp(signals.rankingStabilityScore * profile.maxStabilizationAmplification * damp, 0, profile.maxStabilizationAmplification);
  const driftDampening = clamp(detection.rankingDriftScore * profile.maxDelta * 0.5 * damp, 0, profile.maxDelta);
  const fatigueDampening = clamp(detection.signalFatigueScore * profile.maxDelta * 0.4 * damp, 0, profile.maxDelta);
  const trustStabilization = clamp((1 - detection.trustDegradationScore) * profile.maxDelta * 0.35 * damp, 0, profile.maxDelta);
  const conversionStabilization = clamp((1 - detection.conversionInstabilityScore) * profile.maxDelta * 0.35 * damp, 0, profile.maxDelta);
  const integrityReinforcement = clamp(signals.learningHarmony * profile.maxContinuityAmplification * 0.6, 0, profile.maxContinuityAmplification);

  const laneScale =
    balance.routingLane === "continuity-safe" || balance.routingLane === "reinforce"
      ? 1.04
      : balance.routingLane === "drift-check" ||
          balance.routingLane === "fatigue-check" ||
          balance.routingLane === "confidence-check" ||
          balance.routingLane === "oscillation-check" ||
          balance.routingLane === "trust-check" ||
          balance.routingLane === "conversion-check"
        ? 0.7
        : 0.93;

  const learningDelta = clamp(
    (continuityInfluence + stabilizationInfluence + trustStabilization + conversionStabilization + integrityReinforcement - driftDampening * 0.5 - fatigueDampening * 0.4) *
      0.06 *
      laneScale,
    0,
    profile.maxDelta
  );

  return {
    learningDelta: round3(Math.max(0, learningDelta)),
    continuityInfluence: round3(continuityInfluence),
    stabilizationInfluence: round3(stabilizationInfluence),
    driftDampening: round3(driftDampening),
    fatigueDampening: round3(fatigueDampening),
    trustStabilization: round3(trustStabilization),
    conversionStabilization: round3(conversionStabilization),
    integrityReinforcement: round3(integrityReinforcement),
  };
}

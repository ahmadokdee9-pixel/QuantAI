/**
 * P5.5 — Reasoning balancer (bounded weights + upstream dampening).
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { CommerceReasoningGraph } from "@/lib/reasoning/reasoningGraph";
import type { ReasoningProfile } from "@/lib/reasoning/reasoningProfiles";
import type { ReasoningRoutingLane } from "@/lib/reasoning/reasoningFlags";
import type { ReasoningSignalBundle } from "@/lib/reasoning/reasoningSignals";

export type ReasoningBalanceResult = {
  routingLane: ReasoningRoutingLane;
  governanceDampen: number;
  calibrationScale: number;
  fusionStable: boolean;
  coordinationStable: boolean;
  memoryContinuity: number;
  balanceScore: number;
};

export type ReasoningBlendInfluence = {
  reasoningDelta: number;
  trustReasoning: number;
  valueReasoning: number;
  premiumReasoning: number;
  qualityReasoning: number;
  urgencyReasoning: number;
  recommendationReasoning: number;
  comparisonReasoning: number;
  continuityStrength: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveReasoningRoutingLane(args: {
  signals: ReasoningSignalBundle;
  fusion: IntentFusionMeta;
  coordination: IntentCoordinationMeta;
  governance: IntentGovernanceMeta;
  orchestration: IntentOrchestrationMeta;
}): ReasoningRoutingLane {
  const { signals, fusion, coordination, governance, orchestration } = args;

  if (governance.anomalyDetected || orchestration.monitoring.orchestrationInstability) return "stabilize";
  if (fusion.rollbackTriggered || fusion.replayIntegrity < 60) return "replay-protect";
  if (signals.reasoningConfidence < 0.4) return "confidence-check";
  if (signals.comparisonConfidence >= 0.5) return "compare";
  if (coordination.routingLane === "reinforce") return "reinforce";
  if (fusion.routingLane === "recover" || signals.suppressionRecovery > 0.3) return "recover";
  if (signals.trust >= 0.3 && signals.value >= 0.25) return "reasoning-balance";
  return "hold";
}

export function computeReasoningBalance(args: {
  signals: ReasoningSignalBundle;
  graph: CommerceReasoningGraph;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  coordination: IntentCoordinationMeta;
  fusion: IntentFusionMeta;
  profile: ReasoningProfile;
}): ReasoningBalanceResult {
  const { signals, graph, governance, calibration, orchestration, memory, coordination, fusion, profile } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;

  const calibrationScale = clamp(calibration.calibrationScore / 100, 0.5, 1);
  const fusionStable = !fusion.rollbackTriggered && fusion.replayIntegrity >= 50 && fusion.fusionScore >= 40;
  const coordinationStable =
    !coordination.rollbackTriggered && coordination.reasoningStability >= 50 && coordination.graphIntegrity >= 50;
  const memoryContinuity = clamp(memory.continuityScore / 100, 0, 1);

  let routingLane = resolveReasoningRoutingLane({ signals, fusion, coordination, governance, orchestration });
  if (!profile.allowsMutation) routingLane = "hold";

  const balanceScore = Math.min(
    100,
    Math.round(
      signals.reasoningConfidence * 35 +
        graph.graphIntegrity * 0.25 +
        fusion.fusionScore * 0.15 +
        coordination.coordinationScore * 0.1 +
        memory.memoryScore * 0.1 +
        calibration.calibrationScore * 0.05
    )
  );

  return {
    routingLane,
    governanceDampen,
    calibrationScale,
    fusionStable,
    coordinationStable,
    memoryContinuity,
    balanceScore,
  };
}

export function computeReasoningBlendInfluence(args: {
  signals: ReasoningSignalBundle;
  balance: ReasoningBalanceResult;
  profile: ReasoningProfile;
}): ReasoningBlendInfluence {
  const { signals, balance, profile } = args;
  const damp = balance.governanceDampen * balance.calibrationScale;

  const trustReasoning = clamp(signals.trust * profile.maxTrustAmplification * damp, 0, profile.maxTrustAmplification);
  const valueReasoning = clamp(signals.value * profile.maxDelta * damp, 0, profile.maxDelta);
  const premiumReasoning = clamp(
    signals.premium * profile.maxPremiumAmplification * damp,
    0,
    profile.maxPremiumAmplification
  );
  const qualityReasoning = clamp(signals.quality * profile.maxDelta * 0.7 * damp, 0, profile.maxDelta);
  const urgencyReasoning = clamp(signals.urgency * profile.maxDelta * 0.55 * damp, 0, profile.maxDelta);
  const recommendationReasoning = clamp(
    signals.recommendationStrength * profile.maxConfidenceAmplification * damp,
    0,
    profile.maxConfidenceAmplification
  );
  const comparisonReasoning = clamp(
    signals.comparisonConfidence * profile.maxConfidenceAmplification * 0.8 * damp,
    0,
    profile.maxConfidenceAmplification
  );
  const continuityStrength = clamp(
    signals.rankingContinuity * balance.memoryContinuity * profile.maxDelta,
    0,
    profile.maxDelta
  );

  const laneScale =
    balance.routingLane === "reinforce"
      ? 1.05
      : balance.routingLane === "reasoning-balance"
        ? 1
        : balance.routingLane === "replay-protect" || balance.routingLane === "confidence-check"
          ? 0.8
          : 0.95;

  const reasoningDelta = clamp(
    (trustReasoning +
      valueReasoning +
      premiumReasoning +
      qualityReasoning +
      urgencyReasoning +
      recommendationReasoning +
      comparisonReasoning +
      continuityStrength) *
      0.1 *
      laneScale,
    0,
    profile.maxDelta
  );

  return {
    reasoningDelta: round3(reasoningDelta),
    trustReasoning: round3(trustReasoning),
    valueReasoning: round3(valueReasoning),
    premiumReasoning: round3(premiumReasoning),
    qualityReasoning: round3(qualityReasoning),
    urgencyReasoning: round3(urgencyReasoning),
    recommendationReasoning: round3(recommendationReasoning),
    comparisonReasoning: round3(comparisonReasoning),
    continuityStrength: round3(continuityStrength),
  };
}

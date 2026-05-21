/**
 * P5.6 — Decision balancer (bounded weights + upstream dampening).
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { CommerceDecisionGraph } from "@/lib/decision/decisionGraph";
import type { DecisionProfile } from "@/lib/decision/decisionProfiles";
import type { DecisionRoutingLane } from "@/lib/decision/decisionFlags";
import type { DecisionSignalBundle } from "@/lib/decision/decisionSignals";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";

export type DecisionBalanceResult = {
  routingLane: DecisionRoutingLane;
  governanceDampen: number;
  calibrationScale: number;
  reasoningStable: boolean;
  fusionStable: boolean;
  memoryContinuity: number;
  balanceScore: number;
  decisionConfidence: number;
};

export type DecisionBlendInfluence = {
  decisionDelta: number;
  trustDecision: number;
  valueDecision: number;
  premiumDecision: number;
  qualityDecision: number;
  budgetDecision: number;
  comparisonDecision: number;
  merchantDecision: number;
  deliveryDecision: number;
  continuityStrength: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveDecisionRoutingLane(args: {
  signals: DecisionSignalBundle;
  reasoning: AdaptiveReasoningMeta;
  fusion: IntentFusionMeta;
  governance: IntentGovernanceMeta;
  orchestration: IntentOrchestrationMeta;
}): DecisionRoutingLane {
  const { signals, reasoning, fusion, governance, orchestration } = args;

  if (governance.anomalyDetected || orchestration.monitoring.orchestrationInstability) return "stabilize";
  if (reasoning.rollbackTriggered || reasoning.replayIntegrity < 60) return "replay-protect";
  if (signals.returnRiskScore > 0.2 || signals.merchantReliability < 0.25) return "risk-check";
  if (signals.recommendationStrength < 0.15 && reasoning.reasoningConfidence < 0.4) return "confidence-check";
  if (signals.comparisonConfidence >= 0.4) return "compare";
  if (reasoning.routingLane === "reinforce") return "reinforce";
  if (signals.trustScore >= 0.25 && signals.valueScore >= 0.2) return "decision-balance";
  if (signals.stabilityScore >= 0.3 && signals.discountAuthenticity >= 0.5) return "commerce-safe";
  return "hold";
}

export function computeDecisionBalance(args: {
  signals: DecisionSignalBundle;
  graph: CommerceDecisionGraph;
  decisionConfidence: number;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  fusion: IntentFusionMeta;
  reasoning: AdaptiveReasoningMeta;
  profile: DecisionProfile;
}): DecisionBalanceResult {
  const { signals, graph, decisionConfidence, governance, calibration, orchestration, memory, fusion, reasoning, profile } =
    args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;

  const calibrationScale = clamp(calibration.calibrationScore / 100, 0.5, 1);
  const reasoningStable = !reasoning.rollbackTriggered && reasoning.replayIntegrity >= 50 && reasoning.reasoningScore >= 40;
  const fusionStable = !fusion.rollbackTriggered && fusion.replayIntegrity >= 50;
  const memoryContinuity = clamp(memory.continuityScore / 100, 0, 1);

  let routingLane = resolveDecisionRoutingLane({ signals, reasoning, fusion, governance, orchestration });
  if (!profile.allowsMutation) routingLane = "hold";

  const balanceScore = Math.min(
    100,
    Math.round(
      decisionConfidence * 40 +
        graph.graphIntegrity * 0.2 +
        reasoning.reasoningScore * 0.15 +
        fusion.fusionScore * 0.1 +
        signals.stabilityScore * 15
    )
  );

  return {
    routingLane,
    governanceDampen,
    calibrationScale,
    reasoningStable,
    fusionStable,
    memoryContinuity,
    balanceScore,
    decisionConfidence,
  };
}

export function computeDecisionBlendInfluence(args: {
  signals: DecisionSignalBundle;
  balance: DecisionBalanceResult;
  profile: DecisionProfile;
}): DecisionBlendInfluence {
  const { signals, balance, profile } = args;
  const damp = balance.governanceDampen * balance.calibrationScale;

  const trustDecision = clamp(signals.trustScore * profile.maxTrustAmplification * damp, 0, profile.maxTrustAmplification);
  const valueDecision = clamp(signals.valueScore * profile.maxDelta * damp, 0, profile.maxDelta);
  const premiumDecision = clamp(
    signals.premiumScore * profile.maxPremiumAmplification * damp,
    0,
    profile.maxPremiumAmplification
  );
  const qualityDecision = clamp(signals.qualityConfidence * profile.maxDelta * 0.7 * damp, 0, profile.maxDelta);
  const budgetDecision = clamp(signals.budgetAlignment * profile.maxDelta * 0.55 * damp, 0, profile.maxDelta);
  const comparisonDecision = clamp(
    signals.comparisonConfidence * profile.maxComparisonInfluence * damp,
    0,
    profile.maxComparisonInfluence
  );
  const merchantDecision = clamp(signals.merchantReliability * profile.maxTrustAmplification * 0.8 * damp, 0, profile.maxTrustAmplification);
  const deliveryDecision = clamp(signals.deliveryConfidence * profile.maxDelta * 0.5 * damp, 0, profile.maxDelta);
  const continuityStrength = clamp(
    signals.rankingContinuity * balance.memoryContinuity * profile.maxDelta,
    0,
    profile.maxDelta
  );

  const laneScale =
    balance.routingLane === "reinforce"
      ? 1.05
      : balance.routingLane === "decision-balance" || balance.routingLane === "commerce-safe"
        ? 1
        : balance.routingLane === "risk-check" || balance.routingLane === "confidence-check"
          ? 0.8
          : 0.95;

  const decisionDelta = clamp(
    (trustDecision +
      valueDecision +
      premiumDecision +
      qualityDecision +
      budgetDecision +
      comparisonDecision +
      merchantDecision +
      deliveryDecision +
      continuityStrength) *
      0.09 *
      laneScale,
    0,
    profile.maxDelta
  );

  return {
    decisionDelta: round3(decisionDelta),
    trustDecision: round3(trustDecision),
    valueDecision: round3(valueDecision),
    premiumDecision: round3(premiumDecision),
    qualityDecision: round3(qualityDecision),
    budgetDecision: round3(budgetDecision),
    comparisonDecision: round3(comparisonDecision),
    merchantDecision: round3(merchantDecision),
    deliveryDecision: round3(deliveryDecision),
    continuityStrength: round3(continuityStrength),
  };
}

/**
 * P6.7 — Commerce reasoning graph balancer (routing + bounded influence).
 */

import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { CommerceReasoningGraphContradictionResult } from "@/lib/commerceReasoningGraph/commerceReasoningGraphContradictions";
import type { CommerceReasoningGraphDetection } from "@/lib/commerceReasoningGraph/commerceReasoningGraphDetection";
import type { CommerceReasoningGraphSignalBundle } from "@/lib/commerceReasoningGraph/commerceReasoningGraphConfidence";
import type { CommerceReasoningGraphRoutingLane } from "@/lib/commerceReasoningGraph/commerceReasoningGraphFlags";
import type { AutonomousCommerceReasoningGraphProfile } from "@/lib/commerceReasoningGraph/commerceReasoningGraphProfiles";

export type CommerceReasoningGraphBalanceResult = {
  routingLane: CommerceReasoningGraphRoutingLane;
  governanceDampen: number;
  decisionStable: boolean;
  balanceScore: number;
  graphConfidence: number;
};

export type CommerceReasoningGraphBlendInfluence = {
  graphDelta: number;
  pathInfluence: number;
  causalInfluence: number;
  circularDampening: number;
  driftDampening: number;
  continuityStabilization: number;
  causalityStabilization: number;
  graphReinforcement: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveCommerceReasoningGraphRoutingLane(args: {
  signals: CommerceReasoningGraphSignalBundle;
  detection: CommerceReasoningGraphDetection;
  contradictions: CommerceReasoningGraphContradictionResult;
  commerceDecision: CommerceDecisionIntelligenceMeta;
  governance: IntentGovernanceMeta;
}): CommerceReasoningGraphRoutingLane {
  const { signals, detection, contradictions, commerceDecision, governance } = args;

  if (governance.anomalyDetected || commerceDecision.rollbackTriggered) return "stabilize";
  if (commerceDecision.routingLane === "replay-protect") return "replay-protect";
  if (detection.unstableReasoningStructureDetected) return "structure-check";
  if (detection.circularReasoningInfluenceDetected) return "circular-check";
  if (detection.conflictingReasoningBranchDetected) return "branch-check";
  if (detection.weakCausalRelationshipDetected) return "causal-check";
  if (detection.reasoningDriftEscalationDetected) return "drift-check";
  if (detection.unstableRankingCausalityDetected) return "causality-check";
  if (contradictions.contradictionCount >= 2) return "stabilize";
  if (signals.graphExecutionIntegrity < 0.4) return "path-check";
  if (commerceDecision.routingLane === "reinforce") return "reinforce";
  if (signals.reasoningHarmony >= 0.55 && signals.deterministicDecisionCausality >= 0.5) return "graph-safe";
  return "hold";
}

export function computeCommerceReasoningGraphBalance(args: {
  signals: CommerceReasoningGraphSignalBundle;
  graphConfidence: number;
  governance: IntentGovernanceMeta;
  commerceDecision: CommerceDecisionIntelligenceMeta;
  detection: CommerceReasoningGraphDetection;
  contradictions: CommerceReasoningGraphContradictionResult;
  profile: AutonomousCommerceReasoningGraphProfile;
}): CommerceReasoningGraphBalanceResult {
  const { signals, graphConfidence, governance, commerceDecision, detection, contradictions, profile } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;
  if (detection.circularReasoningInfluenceDetected) governanceDampen *= 0.92;
  if (detection.conflictingReasoningBranchDetected) governanceDampen *= 0.94;

  const decisionStable =
    !commerceDecision.rollbackTriggered &&
    (commerceDecision.analytics?.replayIntegrityAnalytics ?? 0) >= 50 &&
    !detection.unstableRankingCausalityDetected;

  let routingLane = resolveCommerceReasoningGraphRoutingLane({ signals, detection, contradictions, commerceDecision, governance });

  if (!profile.allowsMutation && routingLane !== "replay-protect" && routingLane !== "stabilize") {
    routingLane = "hold";
  }

  const balanceScore = Math.min(
    100,
    Math.round(graphConfidence * 40 + signals.reasoningHarmony * 25 + signals.graphIntegrityScore * 15 + (commerceDecision.decisionScore ?? 0) * 0.1)
  );

  return { routingLane, governanceDampen, decisionStable, balanceScore, graphConfidence };
}

export function computeCommerceReasoningGraphBlendInfluence(args: {
  signals: CommerceReasoningGraphSignalBundle;
  detection: CommerceReasoningGraphDetection;
  balance: CommerceReasoningGraphBalanceResult;
  profile: AutonomousCommerceReasoningGraphProfile;
}): CommerceReasoningGraphBlendInfluence {
  const { signals, detection, balance, profile } = args;
  const damp = balance.governanceDampen;

  const pathInfluence = clamp(signals.trustworthyReasoningContinuity * profile.maxPathAmplification * damp, 0, profile.maxPathAmplification);
  const causalInfluence = clamp(signals.deterministicDecisionCausality * profile.maxCausalAmplification * damp, 0, profile.maxCausalAmplification);
  const circularDampening = clamp(detection.circularReasoningInfluenceScore * profile.maxDelta * 0.5 * damp, 0, profile.maxDelta);
  const driftDampening = clamp(detection.reasoningDriftEscalationScore * profile.maxDelta * 0.4 * damp, 0, profile.maxDelta);
  const continuityStabilization = clamp(signals.trustworthyReasoningContinuity * profile.maxDelta * 0.35 * damp, 0, profile.maxDelta);
  const causalityStabilization = clamp(signals.stableCausalRankingStructure * profile.maxDelta * 0.35 * damp, 0, profile.maxDelta);
  const graphReinforcement = clamp(signals.reasoningHarmony * profile.maxPathAmplification * 0.6, 0, profile.maxPathAmplification);

  const checkLanes = new Set([
    "structure-check",
    "circular-check",
    "branch-check",
    "causal-check",
    "drift-check",
    "causality-check",
    "path-check",
  ]);

  const laneScale =
    balance.routingLane === "graph-safe" || balance.routingLane === "reinforce"
      ? 1.04
      : checkLanes.has(balance.routingLane)
        ? 0.7
        : 0.93;

  const graphDelta = clamp(
    (pathInfluence + causalInfluence + continuityStabilization + causalityStabilization + graphReinforcement - circularDampening * 0.5 - driftDampening * 0.4) *
      0.06 *
      laneScale,
    0,
    profile.maxDelta
  );

  return {
    graphDelta: round3(Math.max(0, graphDelta)),
    pathInfluence: round3(pathInfluence),
    causalInfluence: round3(causalInfluence),
    circularDampening: round3(circularDampening),
    driftDampening: round3(driftDampening),
    continuityStabilization: round3(continuityStabilization),
    causalityStabilization: round3(causalityStabilization),
    graphReinforcement: round3(graphReinforcement),
  };
}

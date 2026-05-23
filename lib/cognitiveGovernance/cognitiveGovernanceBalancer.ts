/**
 * P6.8 — Cognitive governance balancer (routing + bounded influence).
 */

import type { AutonomousCommerceReasoningGraphMeta } from "@/lib/commerceReasoningGraph/commerceReasoningGraphTelemetry";
import type { CognitiveGovernanceContradictionResult } from "@/lib/cognitiveGovernance/cognitiveGovernanceContradictions";
import type { CognitiveGovernanceDetection } from "@/lib/cognitiveGovernance/cognitiveGovernanceDetection";
import type { CognitiveGovernanceSignalBundle } from "@/lib/cognitiveGovernance/cognitiveGovernanceConfidence";
import type { CognitiveGovernanceGovernorsResult } from "@/lib/cognitiveGovernance/cognitiveGovernanceGovernors";
import type { CognitiveGovernanceRoutingLane } from "@/lib/cognitiveGovernance/cognitiveGovernanceFlags";
import type { UnifiedCognitiveGovernanceProfile } from "@/lib/cognitiveGovernance/cognitiveGovernanceProfiles";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";

export type CognitiveGovernanceBalanceResult = {
  routingLane: CognitiveGovernanceRoutingLane;
  governanceDampen: number;
  graphStable: boolean;
  balanceScore: number;
  governanceConfidence: number;
};

export type CognitiveGovernanceBlendInfluence = {
  governanceDelta: number;
  equilibriumInfluence: number;
  influenceStabilization: number;
  confidenceNormalization: number;
  continuityReinforcement: number;
  causalityReinforcement: number;
  recursiveSuppression: number;
  driftSuppression: number;
  governanceReinforcement: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveCognitiveGovernanceRoutingLane(args: {
  signals: CognitiveGovernanceSignalBundle;
  detection: CognitiveGovernanceDetection;
  governors: CognitiveGovernanceGovernorsResult;
  contradictions: CognitiveGovernanceContradictionResult;
  reasoningGraph: AutonomousCommerceReasoningGraphMeta;
  governance: IntentGovernanceMeta;
}): CognitiveGovernanceRoutingLane {
  const { signals, detection, governors, contradictions, reasoningGraph, governance } = args;

  if (governors.crossLayerInstabilityShutdown || governors.unstableGovernanceBlockade) return "rollback-safe";
  if (governance.anomalyDetected || reasoningGraph.rollbackTriggered) return "stabilize";
  if (reasoningGraph.routingLane === "replay-protect") return "replay-protect";
  if (governors.equilibriumDriftRollback || detection.globalEquilibriumDriftDetected) return "equilibrium-check";
  if (governors.causalInconsistencyRollback || detection.causalConsistencyFailureDetected) return "causality-check";
  if (governors.confidenceInflationSuppression || detection.confidenceNormalizationRequired) return "confidence-check";
  if (governors.contradictionCascadeProtection || detection.crossLayerContradictionDetected) return "contradiction-check";
  if (governors.recursiveInfluenceSuppression || detection.influenceInstabilityDetected) return "governance-check";
  if (detection.rankingEquilibriumRiskDetected) return "ranking-safe";
  if (contradictions.contradictionCount >= 2) return "stabilize";
  if (signals.systemReplayIntegrity < 0.4) return "system-safe";
  if (reasoningGraph.routingLane === "reinforce") return "reinforce";
  if (signals.governanceHarmony >= 0.55 && signals.rankingEquilibriumProtection >= 0.5) return "ranking-safe";
  if (reasoningGraph.routingLane === "compare") return "compare";
  return "hold";
}

export function computeCognitiveGovernanceBalance(args: {
  signals: CognitiveGovernanceSignalBundle;
  governanceConfidence: number;
  governance: IntentGovernanceMeta;
  reasoningGraph: AutonomousCommerceReasoningGraphMeta;
  detection: CognitiveGovernanceDetection;
  governors: CognitiveGovernanceGovernorsResult;
  contradictions: CognitiveGovernanceContradictionResult;
  profile: UnifiedCognitiveGovernanceProfile;
}): CognitiveGovernanceBalanceResult {
  const { signals, governanceConfidence, governance, reasoningGraph, detection, governors, contradictions, profile } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;
  if (detection.influenceInstabilityDetected) governanceDampen *= 0.92;
  if (detection.crossLayerContradictionDetected) governanceDampen *= 0.94;
  if (governors.recursiveInfluenceSuppression) governanceDampen *= 0.93;

  const graphStable =
    !reasoningGraph.rollbackTriggered &&
    (reasoningGraph.analytics?.replayIntegrityAnalytics ?? 0) >= 50 &&
    !detection.rankingEquilibriumRiskDetected;

  let routingLane = resolveCognitiveGovernanceRoutingLane({
    signals,
    detection,
    governors,
    contradictions,
    reasoningGraph,
    governance,
  });

  if (!profile.allowsMutation && routingLane !== "replay-protect" && routingLane !== "stabilize" && routingLane !== "rollback-safe") {
    routingLane = "hold";
  }

  const balanceScore = Math.min(
    100,
    Math.round(governanceConfidence * 40 + signals.governanceHarmony * 25 + signals.governanceIntegrityScore * 15 + (reasoningGraph.graphScore ?? 0) * 0.1)
  );

  return { routingLane, governanceDampen, graphStable, balanceScore, governanceConfidence };
}

export function computeCognitiveGovernanceBlendInfluence(args: {
  signals: CognitiveGovernanceSignalBundle;
  detection: CognitiveGovernanceDetection;
  governors: CognitiveGovernanceGovernorsResult;
  balance: CognitiveGovernanceBalanceResult;
  profile: UnifiedCognitiveGovernanceProfile;
}): CognitiveGovernanceBlendInfluence {
  const { signals, detection, governors, balance, profile } = args;
  const damp = balance.governanceDampen;

  const equilibriumInfluence = clamp(signals.rankingEquilibriumProtection * profile.maxEquilibriumAmplification * damp, 0, profile.maxEquilibriumAmplification);
  const influenceStabilization = clamp(signals.influenceStabilization * profile.maxInfluenceAmplification * damp, 0, profile.maxInfluenceAmplification);
  const confidenceNormalization = clamp(signals.confidenceNormalization * profile.maxInfluenceAmplification * 0.6 * damp, 0, profile.maxInfluenceAmplification);
  const continuityReinforcement = clamp(signals.governanceContinuity * profile.maxDelta * 0.35 * damp, 0, profile.maxDelta);
  const causalityReinforcement = clamp(signals.causalConsistencyValidation * profile.maxDelta * 0.35 * damp, 0, profile.maxDelta);
  const recursiveSuppression = clamp(governors.recursiveInfluenceScore * profile.maxDelta * 0.5 * damp, 0, profile.maxDelta);
  const driftSuppression = clamp(governors.equilibriumDriftScore * profile.maxDelta * 0.4 * damp, 0, profile.maxDelta);
  const governanceReinforcement = clamp(signals.governanceHarmony * profile.maxEquilibriumAmplification * 0.6, 0, profile.maxEquilibriumAmplification);

  const checkLanes = new Set([
    "governance-check",
    "equilibrium-check",
    "confidence-check",
    "causality-check",
    "contradiction-check",
    "system-safe",
    "rollback-safe",
  ]);

  const laneScale =
    balance.routingLane === "ranking-safe" || balance.routingLane === "reinforce"
      ? 1.04
      : checkLanes.has(balance.routingLane)
        ? 0.7
        : 0.93;

  const governanceDelta = clamp(
    (equilibriumInfluence + influenceStabilization + continuityReinforcement + causalityReinforcement + governanceReinforcement - recursiveSuppression * 0.5 - driftSuppression * 0.4) *
      0.06 *
      laneScale,
    0,
    profile.maxDelta
  );

  return {
    governanceDelta: round3(Math.max(0, governanceDelta)),
    equilibriumInfluence: round3(equilibriumInfluence),
    influenceStabilization: round3(influenceStabilization),
    confidenceNormalization: round3(confidenceNormalization),
    continuityReinforcement: round3(continuityReinforcement),
    causalityReinforcement: round3(causalityReinforcement),
    recursiveSuppression: round3(recursiveSuppression),
    driftSuppression: round3(driftSuppression),
    governanceReinforcement: round3(governanceReinforcement),
  };
}

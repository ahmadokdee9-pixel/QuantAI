/**
 * P6.8 — Governance continuity + influence stabilization.
 */

import type { AutonomousCommerceReasoningGraphMeta } from "@/lib/commerceReasoningGraph/commerceReasoningGraphTelemetry";
import type { CognitiveGovernanceDetection } from "@/lib/cognitiveGovernance/cognitiveGovernanceDetection";
import type { CognitiveGovernanceGovernorsResult } from "@/lib/cognitiveGovernance/cognitiveGovernanceGovernors";
import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";

export type CognitiveGovernanceStabilization = {
  governanceContinuity: number;
  influenceStabilization: number;
  confidenceNormalization: number;
  rankingEquilibriumProtection: number;
  causalConsistencyValidation: number;
  systemReplayIntegrity: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeCognitiveGovernanceStabilization(args: {
  reasoningGraph: AutonomousCommerceReasoningGraphMeta;
  commerceDecision: CommerceDecisionIntelligenceMeta;
  governors: CognitiveGovernanceGovernorsResult;
  detection: CognitiveGovernanceDetection;
}): CognitiveGovernanceStabilization {
  const { reasoningGraph, commerceDecision, governors, detection } = args;

  const governanceContinuity = round3(
    clamp(
      governors.governanceProtectionScore * 0.35 +
        (reasoningGraph.trustworthyReasoningContinuity ?? 0) * 0.25 +
        (commerceDecision.trustworthyDecisionContinuity ?? 0) * 0.2 +
        detection.governanceIntegrityScore * 0.15 -
        detection.governanceContinuityRiskScore * 0.1,
      0,
      1
    )
  );

  const influenceStabilization = round3(
    clamp(
      governanceContinuity * 0.35 +
        (1 - detection.influenceInstabilityScore) * 0.3 +
        (reasoningGraph.deterministicDecisionCausality ?? 0) * 0.2 -
        governors.recursiveInfluenceScore * 0.12,
      0,
      1
    )
  );

  const confidenceNormalization = round3(
    clamp(
      (reasoningGraph.graphConfidence ?? 0) * 0.35 +
        (commerceDecision.decisionConfidence ?? 0) * 0.25 +
        (1 - governors.confidenceInflationScore) * 0.25 -
        detection.confidenceNormalizationScore * 0.1,
      0,
      1
    )
  );

  const rankingEquilibriumProtection = round3(
    clamp(
      (reasoningGraph.trustworthyReasoningContinuity ?? 0) * 0.3 +
        influenceStabilization * 0.3 +
        (1 - detection.rankingEquilibriumRiskScore) * 0.25 +
        detection.governanceIntegrityScore * 0.1,
      0,
      1
    )
  );

  const causalConsistencyValidation = round3(
    clamp(
      (reasoningGraph.deterministicDecisionCausality ?? 0) * 0.35 +
        rankingEquilibriumProtection * 0.3 +
        (1 - detection.causalConsistencyFailureScore) * 0.2 -
        governors.causalInconsistencyScore * 0.08,
      0,
      1
    )
  );

  const systemReplayIntegrity = round3(
    clamp(
      detection.governanceIntegrityScore * 0.4 +
        causalConsistencyValidation * 0.3 +
        governanceContinuity * 0.15 +
        (reasoningGraph.analytics?.replayIntegrityAnalytics ?? 0) * 0.01 * 0.15,
      0,
      1
    )
  );

  return {
    governanceContinuity,
    influenceStabilization,
    confidenceNormalization,
    rankingEquilibriumProtection,
    causalConsistencyValidation,
    systemReplayIntegrity,
  };
}

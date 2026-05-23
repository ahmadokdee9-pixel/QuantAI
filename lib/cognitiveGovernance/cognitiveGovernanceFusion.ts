/**
 * P6.8 — Unified cognitive governance state synthesis.
 */

import type { AutonomousCommerceReasoningGraphMeta } from "@/lib/commerceReasoningGraph/commerceReasoningGraphTelemetry";
import type { CognitiveGovernanceDetection } from "@/lib/cognitiveGovernance/cognitiveGovernanceDetection";
import type { CognitiveGovernanceGovernorsResult } from "@/lib/cognitiveGovernance/cognitiveGovernanceGovernors";
import type { CognitiveGovernanceStabilization } from "@/lib/cognitiveGovernance/cognitiveGovernanceStabilization";

export type UnifiedCognitiveGovernanceState = {
  globalEquilibriumDriftScore: number;
  crossLayerContradictionScore: number;
  influenceInstabilityScore: number;
  confidenceNormalizationScore: number;
  rankingEquilibriumRiskScore: number;
  governanceContinuityRiskScore: number;
  causalConsistencyFailureScore: number;
  governanceIntegrityScore: number;
  governanceContinuity: number;
  influenceStabilization: number;
  confidenceNormalization: number;
  rankingEquilibriumProtection: number;
  causalConsistencyValidation: number;
  systemReplayIntegrity: number;
  governanceHarmony: number;
  governanceSnapshotHash: string;
  arbitrationExecutionHash: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function synthesizeUnifiedCognitiveGovernanceState(args: {
  reasoningGraph: AutonomousCommerceReasoningGraphMeta;
  governors: CognitiveGovernanceGovernorsResult;
  detection: CognitiveGovernanceDetection;
  stabilization: CognitiveGovernanceStabilization;
}): UnifiedCognitiveGovernanceState {
  const riskScores = [
    args.detection.globalEquilibriumDriftScore,
    args.detection.crossLayerContradictionScore,
    args.detection.influenceInstabilityScore,
    args.detection.confidenceNormalizationScore,
    args.detection.rankingEquilibriumRiskScore,
    args.detection.governanceContinuityRiskScore,
    args.detection.causalConsistencyFailureScore,
  ];
  const meanRisk = riskScores.reduce((s, v) => s + v, 0) / riskScores.length;
  const governanceHarmony = round3(clamp(args.stabilization.systemReplayIntegrity * 0.55 + (1 - meanRisk) * 0.45, 0, 1));

  const governanceSnapshotHash = [
    `graph:${Math.round((args.reasoningGraph.graphScore ?? 0))}`,
    `prot:${Math.round(args.governors.governanceProtectionScore * 1000)}`,
    `int:${Math.round(args.detection.governanceIntegrityScore * 1000)}`,
    `snap:${args.reasoningGraph.reasoningSnapshotHash ?? "none"}`,
  ].join(";");

  const arbitrationExecutionHash = [
    `eq:${Math.round(args.stabilization.rankingEquilibriumProtection * 1000)}`,
    `cont:${Math.round(args.stabilization.governanceContinuity * 1000)}`,
    `caus:${Math.round(args.stabilization.causalConsistencyValidation * 1000)}`,
    `harm:${Math.round(governanceHarmony * 1000)}`,
  ].join(",");

  return {
    globalEquilibriumDriftScore: args.detection.globalEquilibriumDriftScore,
    crossLayerContradictionScore: args.detection.crossLayerContradictionScore,
    influenceInstabilityScore: args.detection.influenceInstabilityScore,
    confidenceNormalizationScore: args.detection.confidenceNormalizationScore,
    rankingEquilibriumRiskScore: args.detection.rankingEquilibriumRiskScore,
    governanceContinuityRiskScore: args.detection.governanceContinuityRiskScore,
    causalConsistencyFailureScore: args.detection.causalConsistencyFailureScore,
    governanceIntegrityScore: args.detection.governanceIntegrityScore,
    governanceContinuity: args.stabilization.governanceContinuity,
    influenceStabilization: args.stabilization.influenceStabilization,
    confidenceNormalization: args.stabilization.confidenceNormalization,
    rankingEquilibriumProtection: args.stabilization.rankingEquilibriumProtection,
    causalConsistencyValidation: args.stabilization.causalConsistencyValidation,
    systemReplayIntegrity: args.stabilization.systemReplayIntegrity,
    governanceHarmony,
    governanceSnapshotHash,
    arbitrationExecutionHash,
  };
}

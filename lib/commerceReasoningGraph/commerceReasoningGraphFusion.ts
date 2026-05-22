/**
 * P6.7 — Unified commerce reasoning graph state synthesis.
 */

import type { CommerceReasoningGraphDetection } from "@/lib/commerceReasoningGraph/commerceReasoningGraphDetection";
import type { CommerceReasoningGraphPath } from "@/lib/commerceReasoningGraph/commerceReasoningGraphPaths";
import type { CommerceReasoningGraphStabilization } from "@/lib/commerceReasoningGraph/commerceReasoningGraphStabilization";

export type UnifiedCommerceReasoningGraphState = {
  unstableReasoningStructureScore: number;
  circularReasoningInfluenceScore: number;
  conflictingReasoningBranchScore: number;
  weakCausalRelationshipScore: number;
  reasoningDriftEscalationScore: number;
  unstableRankingCausalityScore: number;
  graphIntegrityScore: number;
  trustworthyReasoningContinuity: number;
  stableCausalRankingStructure: number;
  deterministicDecisionCausality: number;
  graphExecutionIntegrity: number;
  reasoningHarmony: number;
  reasoningSnapshotHash: string;
  chainExecutionHash: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function synthesizeUnifiedCommerceReasoningGraphState(args: {
  path: CommerceReasoningGraphPath;
  detection: CommerceReasoningGraphDetection;
  stabilization: CommerceReasoningGraphStabilization;
}): UnifiedCommerceReasoningGraphState {
  const riskScores = [
    args.detection.unstableReasoningStructureScore,
    args.detection.circularReasoningInfluenceScore,
    args.detection.conflictingReasoningBranchScore,
    args.detection.weakCausalRelationshipScore,
    args.detection.reasoningDriftEscalationScore,
    args.detection.unstableRankingCausalityScore,
  ];
  const meanRisk = riskScores.reduce((s, v) => s + v, 0) / riskScores.length;
  const reasoningHarmony = round3(clamp(args.stabilization.graphExecutionIntegrity * 0.55 + (1 - meanRisk) * 0.45, 0, 1));

  return {
    unstableReasoningStructureScore: args.detection.unstableReasoningStructureScore,
    circularReasoningInfluenceScore: args.detection.circularReasoningInfluenceScore,
    conflictingReasoningBranchScore: args.detection.conflictingReasoningBranchScore,
    weakCausalRelationshipScore: args.detection.weakCausalRelationshipScore,
    reasoningDriftEscalationScore: args.detection.reasoningDriftEscalationScore,
    unstableRankingCausalityScore: args.detection.unstableRankingCausalityScore,
    graphIntegrityScore: args.detection.graphIntegrityScore,
    trustworthyReasoningContinuity: args.stabilization.trustworthyReasoningContinuity,
    stableCausalRankingStructure: args.stabilization.stableCausalRankingStructure,
    deterministicDecisionCausality: args.stabilization.deterministicDecisionCausality,
    graphExecutionIntegrity: args.stabilization.graphExecutionIntegrity,
    reasoningHarmony,
    reasoningSnapshotHash: args.path.snapshotHash,
    chainExecutionHash: args.path.chainHash,
  };
}

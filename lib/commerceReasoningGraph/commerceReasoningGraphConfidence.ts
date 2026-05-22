/**
 * P6.7 — Commerce reasoning graph confidence + signal bundle.
 */

import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { CommerceReasoningGraphContradictionResult } from "@/lib/commerceReasoningGraph/commerceReasoningGraphContradictions";
import type { CommerceReasoningGraphDetection } from "@/lib/commerceReasoningGraph/commerceReasoningGraphDetection";
import type { UnifiedCommerceReasoningGraphState } from "@/lib/commerceReasoningGraph/commerceReasoningGraphFusion";

export type CommerceReasoningGraphSignalBundle = {
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
  signalHash: string;
  graphExecutionHash: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function buildCommerceReasoningGraphSignalBundle(state: UnifiedCommerceReasoningGraphState): CommerceReasoningGraphSignalBundle {
  const core = {
    unstableReasoningStructureScore: state.unstableReasoningStructureScore,
    circularReasoningInfluenceScore: state.circularReasoningInfluenceScore,
    conflictingReasoningBranchScore: state.conflictingReasoningBranchScore,
    weakCausalRelationshipScore: state.weakCausalRelationshipScore,
    reasoningDriftEscalationScore: state.reasoningDriftEscalationScore,
    unstableRankingCausalityScore: state.unstableRankingCausalityScore,
    graphIntegrityScore: state.graphIntegrityScore,
    trustworthyReasoningContinuity: state.trustworthyReasoningContinuity,
    stableCausalRankingStructure: state.stableCausalRankingStructure,
    deterministicDecisionCausality: state.deterministicDecisionCausality,
    graphExecutionIntegrity: state.graphExecutionIntegrity,
    reasoningHarmony: state.reasoningHarmony,
    reasoningSnapshotHash: state.reasoningSnapshotHash,
    chainExecutionHash: state.chainExecutionHash,
  };

  const signalHash = Object.entries(core)
    .filter(([k]) => !k.endsWith("Hash"))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(Number(v) * 1000)}`)
    .join("|");

  const graphExecutionHash = [
    `int:${core.graphIntegrityScore}`,
    `cont:${core.trustworthyReasoningContinuity}`,
    `caus:${core.deterministicDecisionCausality}`,
    `harm:${core.reasoningHarmony}`,
  ].join(",");

  return { ...core, signalHash, graphExecutionHash };
}

export function computeCommerceReasoningGraphConfidence(args: {
  signals: CommerceReasoningGraphSignalBundle;
  commerceDecision: CommerceDecisionIntelligenceMeta;
  detection: CommerceReasoningGraphDetection;
  contradictions: CommerceReasoningGraphContradictionResult;
  governanceDampen: number;
}): number {
  const { signals, commerceDecision, detection, contradictions, governanceDampen } = args;

  const signalConfidence = clamp(
    signals.reasoningHarmony * 0.22 +
      signals.graphExecutionIntegrity * 0.18 +
      signals.deterministicDecisionCausality * 0.15 +
      signals.trustworthyReasoningContinuity * 0.12 +
      (commerceDecision.decisionConfidence ?? 0) * 0.1 +
      signals.graphIntegrityScore * 0.08 -
      signals.circularReasoningInfluenceScore * 0.08 -
      (detection.conflictingReasoningBranchDetected ? 0.05 : 0),
    0,
    1
  );

  return round3(clamp((signalConfidence - contradictions.uncertaintyScore * 0.1) * governanceDampen, 0, 1));
}

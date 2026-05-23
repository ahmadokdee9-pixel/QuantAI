/**
 * P6.8 — Cognitive governance confidence + signal bundle.
 */

import type { AutonomousCommerceReasoningGraphMeta } from "@/lib/commerceReasoningGraph/commerceReasoningGraphTelemetry";
import type { CognitiveGovernanceContradictionResult } from "@/lib/cognitiveGovernance/cognitiveGovernanceContradictions";
import type { CognitiveGovernanceDetection } from "@/lib/cognitiveGovernance/cognitiveGovernanceDetection";
import type { UnifiedCognitiveGovernanceState } from "@/lib/cognitiveGovernance/cognitiveGovernanceFusion";

export type CognitiveGovernanceSignalBundle = {
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
  signalHash: string;
  governanceExecutionHash: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function buildCognitiveGovernanceSignalBundle(state: UnifiedCognitiveGovernanceState): CognitiveGovernanceSignalBundle {
  const core = {
    globalEquilibriumDriftScore: state.globalEquilibriumDriftScore,
    crossLayerContradictionScore: state.crossLayerContradictionScore,
    influenceInstabilityScore: state.influenceInstabilityScore,
    confidenceNormalizationScore: state.confidenceNormalizationScore,
    rankingEquilibriumRiskScore: state.rankingEquilibriumRiskScore,
    governanceContinuityRiskScore: state.governanceContinuityRiskScore,
    causalConsistencyFailureScore: state.causalConsistencyFailureScore,
    governanceIntegrityScore: state.governanceIntegrityScore,
    governanceContinuity: state.governanceContinuity,
    influenceStabilization: state.influenceStabilization,
    confidenceNormalization: state.confidenceNormalization,
    rankingEquilibriumProtection: state.rankingEquilibriumProtection,
    causalConsistencyValidation: state.causalConsistencyValidation,
    systemReplayIntegrity: state.systemReplayIntegrity,
    governanceHarmony: state.governanceHarmony,
    governanceSnapshotHash: state.governanceSnapshotHash,
    arbitrationExecutionHash: state.arbitrationExecutionHash,
  };

  const signalHash = Object.entries(core)
    .filter(([k]) => !k.endsWith("Hash"))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(Number(v) * 1000)}`)
    .join("|");

  const governanceExecutionHash = [
    `int:${core.governanceIntegrityScore}`,
    `cont:${core.governanceContinuity}`,
    `eq:${core.rankingEquilibriumProtection}`,
    `harm:${core.governanceHarmony}`,
  ].join(",");

  return { ...core, signalHash, governanceExecutionHash };
}

export function computeCognitiveGovernanceConfidence(args: {
  signals: CognitiveGovernanceSignalBundle;
  reasoningGraph: AutonomousCommerceReasoningGraphMeta;
  detection: CognitiveGovernanceDetection;
  contradictions: CognitiveGovernanceContradictionResult;
  governanceDampen: number;
}): number {
  const { signals, reasoningGraph, detection, contradictions, governanceDampen } = args;

  const signalConfidence = clamp(
    signals.governanceHarmony * 0.22 +
      signals.systemReplayIntegrity * 0.18 +
      signals.causalConsistencyValidation * 0.15 +
      signals.governanceContinuity * 0.12 +
      (reasoningGraph.graphConfidence ?? 0) * 0.1 +
      signals.governanceIntegrityScore * 0.08 -
      signals.influenceInstabilityScore * 0.08 -
      (detection.crossLayerContradictionDetected ? 0.05 : 0),
    0,
    1
  );

  return round3(clamp((signalConfidence - contradictions.uncertaintyScore * 0.1) * governanceDampen, 0, 1));
}

/**
 * P6.8 — Unified cognitive governance detection (deterministic; no memory storage).
 */

import type { AutonomousCommerceReasoningGraphMeta } from "@/lib/commerceReasoningGraph/commerceReasoningGraphTelemetry";
import type { CognitiveGovernanceGovernorsResult } from "@/lib/cognitiveGovernance/cognitiveGovernanceGovernors";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";

export type CognitiveGovernanceDetection = {
  globalEquilibriumDriftDetected: boolean;
  crossLayerContradictionDetected: boolean;
  influenceInstabilityDetected: boolean;
  confidenceNormalizationRequired: boolean;
  rankingEquilibriumRiskDetected: boolean;
  governanceContinuityRiskDetected: boolean;
  causalConsistencyFailureDetected: boolean;
  globalEquilibriumDriftScore: number;
  crossLayerContradictionScore: number;
  influenceInstabilityScore: number;
  confidenceNormalizationScore: number;
  rankingEquilibriumRiskScore: number;
  governanceContinuityRiskScore: number;
  causalConsistencyFailureScore: number;
  governanceIntegrityScore: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function detectCognitiveGovernanceSignals(args: {
  reasoningGraph: AutonomousCommerceReasoningGraphMeta;
  governors: CognitiveGovernanceGovernorsResult;
  governance: IntentGovernanceMeta;
}): CognitiveGovernanceDetection {
  const { reasoningGraph, governors, governance } = args;

  const globalEquilibriumDriftScore = round3(clamp(governors.equilibriumDriftScore * 0.7 + (reasoningGraph.graphDelta ?? 0) * 0.15, 0, 1));
  const globalEquilibriumDriftDetected = globalEquilibriumDriftScore >= 0.38 || governors.equilibriumDriftRollback;

  const crossLayerContradictionScore = round3(clamp(governors.contradictionCascadeScore * 0.65 + (reasoningGraph.contradictionCount ?? 0) * 0.08, 0, 1));
  const crossLayerContradictionDetected = crossLayerContradictionScore >= 0.35 || governors.contradictionCascadeProtection;

  const influenceInstabilityScore = round3(clamp(governors.recursiveInfluenceScore * 0.6 + governors.crossLayerInstabilityScore * 0.25, 0, 1));
  const influenceInstabilityDetected = influenceInstabilityScore >= 0.38 || governors.recursiveInfluenceSuppression;

  const confidenceNormalizationScore = round3(clamp(governors.confidenceInflationScore * 0.75 + (1 - (reasoningGraph.graphConfidence ?? 0)) * 0.1, 0, 1));
  const confidenceNormalizationRequired = confidenceNormalizationScore >= 0.35 || governors.confidenceInflationSuppression;

  const rankingEquilibriumRiskScore = round3(
    clamp((1 - (reasoningGraph.trustworthyReasoningContinuity ?? 0)) * 0.35 + globalEquilibriumDriftScore * 0.35 + (reasoningGraph.unstableRankingCausalityDetected ? 0.15 : 0), 0, 1)
  );
  const rankingEquilibriumRiskDetected = rankingEquilibriumRiskScore >= 0.4 || reasoningGraph.unstableRankingCausalityDetected;

  const governanceContinuityRiskScore = round3(clamp((governance.anomalyDetected ? 0.3 : 0) + governors.unstableGovernanceScore * 0.45 + (1 - governors.governanceProtectionScore) * 0.2, 0, 1));
  const governanceContinuityRiskDetected = governanceContinuityRiskScore >= 0.38 || governors.unstableGovernanceBlockade;

  const causalConsistencyFailureScore = round3(clamp(governors.causalInconsistencyScore * 0.7 + (reasoningGraph.weakCausalRelationshipDetected ? 0.2 : 0), 0, 1));
  const causalConsistencyFailureDetected = causalConsistencyFailureScore >= 0.38 || governors.causalInconsistencyRollback;

  const riskMean = [
    globalEquilibriumDriftScore,
    crossLayerContradictionScore,
    influenceInstabilityScore,
    confidenceNormalizationScore,
    rankingEquilibriumRiskScore,
    governanceContinuityRiskScore,
    causalConsistencyFailureScore,
  ].reduce((s, v) => s + v, 0) / 7;

  const governanceIntegrityScore = round3(clamp(1 - riskMean * 0.85 + (reasoningGraph.graphIntegrityScore ?? 0) * 0.12 + governors.governanceProtectionScore * 0.08, 0, 1));

  return {
    globalEquilibriumDriftDetected,
    crossLayerContradictionDetected,
    influenceInstabilityDetected,
    confidenceNormalizationRequired,
    rankingEquilibriumRiskDetected,
    governanceContinuityRiskDetected,
    causalConsistencyFailureDetected,
    globalEquilibriumDriftScore,
    crossLayerContradictionScore,
    influenceInstabilityScore,
    confidenceNormalizationScore,
    rankingEquilibriumRiskScore,
    governanceContinuityRiskScore,
    causalConsistencyFailureScore,
    governanceIntegrityScore,
  };
}

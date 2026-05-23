/**
 * P6.8 — Cross-layer contradiction arbitration.
 */

import type { AutonomousCommerceReasoningGraphMeta } from "@/lib/commerceReasoningGraph/commerceReasoningGraphTelemetry";
import type { CognitiveGovernanceDetection } from "@/lib/cognitiveGovernance/cognitiveGovernanceDetection";
import type { CognitiveGovernanceGovernorsResult } from "@/lib/cognitiveGovernance/cognitiveGovernanceGovernors";
import type { UnifiedCognitiveGovernanceState } from "@/lib/cognitiveGovernance/cognitiveGovernanceFusion";

export type CognitiveGovernanceContradictionResult = {
  contradictionCount: number;
  contradictions: string[];
  uncertaintyScore: number;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function detectCognitiveGovernanceContradictions(args: {
  state: UnifiedCognitiveGovernanceState;
  detection: CognitiveGovernanceDetection;
  governors: CognitiveGovernanceGovernorsResult;
  reasoningGraph: AutonomousCommerceReasoningGraphMeta;
}): CognitiveGovernanceContradictionResult {
  const { state, detection, governors, reasoningGraph } = args;
  const contradictions: string[] = [];

  if (detection.globalEquilibriumDriftDetected && state.rankingEquilibriumProtection >= 0.55) contradictions.push("equilibrium_protection_conflict");
  if (detection.crossLayerContradictionDetected && state.governanceContinuity >= 0.55) contradictions.push("cross_layer_continuity_conflict");
  if (detection.influenceInstabilityDetected && state.influenceStabilization >= 0.55) contradictions.push("influence_stabilization_conflict");
  if (detection.confidenceNormalizationRequired && state.confidenceNormalization >= 0.6) contradictions.push("confidence_normalization_conflict");
  if (governors.crossLayerInstabilityShutdown) contradictions.push("cross_layer_shutdown");
  if (reasoningGraph.rollbackTriggered) contradictions.push("reasoning_graph_rollback");
  if (state.governanceHarmony < 0.35) contradictions.push("governance_imbalance");

  const uncertaintyScore = round3(
    Math.min(1, contradictions.length * 0.1 + (1 - state.governanceHarmony) * 0.2 + (reasoningGraph.contradictionCount ?? 0) * 0.05)
  );

  return {
    contradictionCount: contradictions.length,
    contradictions: contradictions.slice(0, 8),
    uncertaintyScore,
  };
}

/**
 * P6.7 — Reasoning continuity + causal structure stabilization.
 */

import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { CommerceReasoningGraphDetection } from "@/lib/commerceReasoningGraph/commerceReasoningGraphDetection";
import type { CommerceReasoningGraphPath } from "@/lib/commerceReasoningGraph/commerceReasoningGraphPaths";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";

export type CommerceReasoningGraphStabilization = {
  trustworthyReasoningContinuity: number;
  stableCausalRankingStructure: number;
  deterministicDecisionCausality: number;
  graphExecutionIntegrity: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeCommerceReasoningGraphStabilization(args: {
  path: CommerceReasoningGraphPath;
  memoryless: MemorylessCommerceLearningMeta;
  commerceDecision: CommerceDecisionIntelligenceMeta;
  detection: CommerceReasoningGraphDetection;
}): CommerceReasoningGraphStabilization {
  const { path, memoryless, commerceDecision, detection } = args;

  const trustworthyReasoningContinuity = round3(
    clamp(
      path.pathStrength * 0.35 +
        (commerceDecision.trustworthyDecisionContinuity ?? 0) * 0.25 +
        (memoryless.continuityReinforcement ?? 0) * 0.2 +
        detection.graphIntegrityScore * 0.15 -
        detection.circularReasoningInfluenceScore * 0.1,
      0,
      1
    )
  );

  const stableCausalRankingStructure = round3(
    clamp(
      (commerceDecision.recommendationIntegrityStability ?? 0) * 0.35 +
        (commerceDecision.balancedDecisionFormation ?? 0) * 0.25 +
        path.pathStrength * 0.2 +
        detection.graphIntegrityScore * 0.15 -
        detection.unstableRankingCausalityScore * 0.1,
      0,
      1
    )
  );

  const deterministicDecisionCausality = round3(
    clamp(
      stableCausalRankingStructure * 0.4 +
        trustworthyReasoningContinuity * 0.35 +
        (commerceDecision.decisionQualityScore ?? 0) * 0.15 -
        detection.weakCausalRelationshipScore * 0.08,
      0,
      1
    )
  );

  const graphExecutionIntegrity = round3(
    clamp(
      detection.graphIntegrityScore * 0.45 +
        deterministicDecisionCausality * 0.3 +
        trustworthyReasoningContinuity * 0.15 +
        (memoryless.analytics?.replayIntegrityAnalytics ?? 0) * 0.01 * 0.1 -
        detection.reasoningDriftEscalationScore * 0.08,
      0,
      1
    )
  );

  return { trustworthyReasoningContinuity, stableCausalRankingStructure, deterministicDecisionCausality, graphExecutionIntegrity };
}

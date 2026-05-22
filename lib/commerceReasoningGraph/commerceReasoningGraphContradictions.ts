/**
 * P6.7 — Commerce reasoning graph contradiction detection.
 */

import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { CommerceReasoningGraphDetection } from "@/lib/commerceReasoningGraph/commerceReasoningGraphDetection";
import type { UnifiedCommerceReasoningGraphState } from "@/lib/commerceReasoningGraph/commerceReasoningGraphFusion";

export type CommerceReasoningGraphContradictionResult = {
  contradictionCount: number;
  contradictions: string[];
  uncertaintyScore: number;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function detectCommerceReasoningGraphContradictions(args: {
  state: UnifiedCommerceReasoningGraphState;
  detection: CommerceReasoningGraphDetection;
  commerceDecision: CommerceDecisionIntelligenceMeta;
}): CommerceReasoningGraphContradictionResult {
  const { state, detection, commerceDecision } = args;
  const contradictions: string[] = [];

  if (detection.circularReasoningInfluenceDetected && state.trustworthyReasoningContinuity >= 0.55) contradictions.push("circular_continuity_conflict");
  if (detection.conflictingReasoningBranchDetected && state.stableCausalRankingStructure >= 0.55) contradictions.push("branch_causal_conflict");
  if (detection.weakCausalRelationshipDetected && state.deterministicDecisionCausality >= 0.55) contradictions.push("weak_causal_conflict");
  if (commerceDecision.rollbackTriggered) contradictions.push("decision_rollback");
  if (commerceDecision.contradictionCount >= 2) contradictions.push("decision_upstream_conflict");
  if (state.reasoningHarmony < 0.35) contradictions.push("reasoning_imbalance");

  const uncertaintyScore = round3(
    Math.min(1, contradictions.length * 0.1 + (1 - state.reasoningHarmony) * 0.2 + commerceDecision.contradictionCount * 0.05)
  );

  return {
    contradictionCount: contradictions.length,
    contradictions: contradictions.slice(0, 8),
    uncertaintyScore,
  };
}

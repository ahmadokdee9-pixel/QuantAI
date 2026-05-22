/**
 * P6.7 — Commerce reasoning graph detection (deterministic; no user memory).
 */

import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { CommerceReasoningGraphPath } from "@/lib/commerceReasoningGraph/commerceReasoningGraphPaths";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";

export type CommerceReasoningGraphDetection = {
  unstableReasoningStructureDetected: boolean;
  circularReasoningInfluenceDetected: boolean;
  conflictingReasoningBranchDetected: boolean;
  weakCausalRelationshipDetected: boolean;
  reasoningDriftEscalationDetected: boolean;
  unstableRankingCausalityDetected: boolean;
  unstableReasoningStructureScore: number;
  circularReasoningInfluenceScore: number;
  conflictingReasoningBranchScore: number;
  weakCausalRelationshipScore: number;
  reasoningDriftEscalationScore: number;
  unstableRankingCausalityScore: number;
  graphIntegrityScore: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

function variance(nums: number[]): number {
  if (nums.length <= 1) return 0;
  const mean = avg(nums);
  return nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length;
}

export function detectCommerceReasoningGraphSignals(args: {
  path: CommerceReasoningGraphPath;
  strategic: AdaptiveStrategicRankingMeta;
  memoryless: MemorylessCommerceLearningMeta;
  marketReality: MarketRealityIntelligenceMeta;
  commerceDecision: CommerceDecisionIntelligenceMeta;
}): CommerceReasoningGraphDetection {
  const { path, strategic, memoryless, marketReality, commerceDecision } = args;
  const deltas = path.nodes.map((n) => n.delta);
  const confidences = path.nodes.map((n) => n.confidence);
  const lanes = path.nodes.map((n) => n.lane);
  const uniqueLanes = new Set(lanes);

  const unstableReasoningStructureScore = round3(
    clamp((1 - path.pathStrength) * 0.5 + Math.sqrt(variance(confidences)) * 0.35 + (commerceDecision.contradictionCount >= 2 ? 0.15 : 0), 0, 1)
  );
  const unstableReasoningStructureDetected = unstableReasoningStructureScore >= 0.4 || path.pathStrength < 0.35;

  let circularScore = 0;
  for (let i = 1; i < deltas.length; i += 1) {
    if (deltas[i] > deltas[i - 1] && confidences[i] < confidences[i - 1]) circularScore += 0.2;
  }
  if (memoryless.rollbackTriggered) circularScore += 0.12;
  if (marketReality.rollbackTriggered) circularScore += 0.12;
  if (commerceDecision.rollbackTriggered) circularScore += 0.12;
  if (commerceDecision.contradictionCount >= 2) circularScore += 0.08;
  const circularReasoningInfluenceScore = round3(clamp(circularScore, 0, 1));
  const circularReasoningInfluenceDetected = circularReasoningInfluenceScore >= 0.35;

  const conflictingReasoningBranchScore = round3(clamp(uniqueLanes.size / path.pathDepth * 0.55 + (commerceDecision.decisionInconsistencyDetected ? 0.2 : 0), 0, 1));
  const conflictingReasoningBranchDetected = conflictingReasoningBranchScore >= 0.45 || uniqueLanes.size >= 5;

  const weakCausalRelationshipScore = round3(
    clamp((1 - (commerceDecision.trustworthyDecisionContinuity ?? 0)) * 0.35 + (1 - (marketReality.verifiedPricingContinuity ?? 0)) * 0.25 + (1 - path.pathStrength) * 0.25, 0, 1)
  );
  const weakCausalRelationshipDetected = weakCausalRelationshipScore >= 0.38;

  const reasoningDriftEscalationScore = round3(clamp(Math.sqrt(variance(deltas)) * 0.75 + (strategic.analytics?.topDriftCount ?? 0) * 0.06 + (commerceDecision.analytics?.topDriftCount ?? 0) * 0.06, 0, 1));
  const reasoningDriftEscalationDetected = reasoningDriftEscalationScore >= 0.35;

  const scoreSpread = Math.max(...path.nodes.map((n) => n.score)) - Math.min(...path.nodes.map((n) => n.score));
  const unstableRankingCausalityScore = round3(clamp(scoreSpread * 0.008 + Math.sqrt(variance(deltas)) * 0.4 + (memoryless.strategicOscillationDetected ? 0.15 : 0), 0, 1));
  const unstableRankingCausalityDetected = unstableRankingCausalityScore >= 0.4 || commerceDecision.unstableStrategicTradeoffDetected;

  const riskMean = avg([
    unstableReasoningStructureScore,
    circularReasoningInfluenceScore,
    conflictingReasoningBranchScore,
    weakCausalRelationshipScore,
    reasoningDriftEscalationScore,
    unstableRankingCausalityScore,
  ]);
  const graphIntegrityScore = round3(clamp(1 - riskMean * 0.85 + path.pathStrength * 0.15, 0, 1));

  return {
    unstableReasoningStructureDetected,
    circularReasoningInfluenceDetected,
    conflictingReasoningBranchDetected,
    weakCausalRelationshipDetected,
    reasoningDriftEscalationDetected,
    unstableRankingCausalityDetected,
    unstableReasoningStructureScore,
    circularReasoningInfluenceScore,
    conflictingReasoningBranchScore,
    weakCausalRelationshipScore,
    reasoningDriftEscalationScore,
    unstableRankingCausalityScore,
    graphIntegrityScore,
  };
}

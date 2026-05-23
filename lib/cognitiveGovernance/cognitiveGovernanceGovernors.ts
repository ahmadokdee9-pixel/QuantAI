/**
 * P6.8 — Governance protection governors (deterministic; no memory storage).
 */

import type { AutonomousCommerceReasoningGraphMeta } from "@/lib/commerceReasoningGraph/commerceReasoningGraphTelemetry";
import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";

export type CognitiveGovernanceGovernorsResult = {
  equilibriumDriftRollback: boolean;
  crossLayerInstabilityShutdown: boolean;
  confidenceInflationSuppression: boolean;
  recursiveInfluenceSuppression: boolean;
  unstableGovernanceBlockade: boolean;
  causalInconsistencyRollback: boolean;
  contradictionCascadeProtection: boolean;
  equilibriumDriftScore: number;
  crossLayerInstabilityScore: number;
  confidenceInflationScore: number;
  recursiveInfluenceScore: number;
  unstableGovernanceScore: number;
  causalInconsistencyScore: number;
  contradictionCascadeScore: number;
  governanceProtectionScore: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeCognitiveGovernanceGovernors(args: {
  reasoningGraph: AutonomousCommerceReasoningGraphMeta;
  commerceDecision: CommerceDecisionIntelligenceMeta;
  marketReality: MarketRealityIntelligenceMeta;
  memoryless: MemorylessCommerceLearningMeta;
  strategic: AdaptiveStrategicRankingMeta;
  governance: IntentGovernanceMeta;
}): CognitiveGovernanceGovernorsResult {
  const { reasoningGraph, commerceDecision, marketReality, memoryless, strategic, governance } = args;

  const layerDeltas = [
    reasoningGraph.graphDelta ?? 0,
    commerceDecision.decisionDelta ?? 0,
    marketReality.realityDelta ?? 0,
    memoryless.learningDelta ?? 0,
    strategic.strategicRankingDelta ?? 0,
  ];
  const deltaSpread = Math.max(...layerDeltas) - Math.min(...layerDeltas);
  const equilibriumDriftScore = round3(clamp(deltaSpread * 0.55 + (reasoningGraph.analytics?.topDriftCount ?? 0) * 0.08, 0, 1));
  const equilibriumDriftRollback = equilibriumDriftScore >= 0.42 || reasoningGraph.reasoningDriftEscalationDetected;

  const rollbackCount = [
    reasoningGraph.rollbackTriggered,
    commerceDecision.rollbackTriggered,
    marketReality.rollbackTriggered,
    memoryless.rollbackTriggered,
    strategic.rollbackTriggered,
  ].filter(Boolean).length;
  const crossLayerInstabilityScore = round3(clamp(rollbackCount * 0.18 + (governance.anomalyDetected ? 0.25 : 0), 0, 1));
  const crossLayerInstabilityShutdown = crossLayerInstabilityScore >= 0.35 || rollbackCount >= 2;

  const layerConfidences = [
    reasoningGraph.graphConfidence ?? 0,
    commerceDecision.decisionConfidence ?? 0,
    marketReality.realityConfidence ?? 0,
    memoryless.learningConfidence ?? 0,
    strategic.strategicRankingConfidence ?? 0,
  ];
  const confidenceMean = layerConfidences.reduce((s, v) => s + v, 0) / layerConfidences.length;
  const confidenceInflationScore = round3(clamp(Math.max(0, confidenceMean - 0.55) * 1.4 + (reasoningGraph.graphScore ?? 0) * 0.002, 0, 1));
  const confidenceInflationSuppression = confidenceInflationScore >= 0.38;

  const recursiveInfluenceScore = round3(
    clamp(
      (reasoningGraph.graphDelta ?? 0) * 0.35 +
        (commerceDecision.decisionDelta ?? 0) * 0.25 +
        (reasoningGraph.circularReasoningInfluenceDetected ? 0.2 : 0),
      0,
      1
    )
  );
  const recursiveInfluenceSuppression = recursiveInfluenceScore >= 0.4 || reasoningGraph.circularReasoningInfluenceDetected;

  const unstableGovernanceScore = round3(
    clamp((governance.anomalyDetected ? 0.35 : 0) + (governance.blockedPolicies.length > 0 ? 0.2 : 0) + (1 - (reasoningGraph.graphIntegrityScore ?? 0)) * 0.3, 0, 1)
  );
  const unstableGovernanceBlockade = unstableGovernanceScore >= 0.4 || !reasoningGraph.graphActive;

  const causalInconsistencyScore = round3(
    clamp(
      (reasoningGraph.unstableRankingCausalityDetected ? 0.3 : 0) +
        (1 - (reasoningGraph.deterministicDecisionCausality ?? 0)) * 0.35 +
        (commerceDecision.unstableStrategicTradeoffDetected ? 0.2 : 0),
      0,
      1
    )
  );
  const causalInconsistencyRollback = causalInconsistencyScore >= 0.38 || reasoningGraph.weakCausalRelationshipDetected;

  const contradictionTotal =
    (reasoningGraph.contradictionCount ?? 0) + (commerceDecision.contradictionCount ?? 0) + (marketReality.contradictionCount ?? 0);
  const contradictionCascadeScore = round3(clamp(contradictionTotal * 0.12 + (reasoningGraph.conflictingReasoningBranchDetected ? 0.2 : 0), 0, 1));
  const contradictionCascadeProtection = contradictionCascadeScore >= 0.35 || contradictionTotal >= 3;

  const protectionScores = [
    equilibriumDriftScore,
    crossLayerInstabilityScore,
    confidenceInflationScore,
    recursiveInfluenceScore,
    unstableGovernanceScore,
    causalInconsistencyScore,
    contradictionCascadeScore,
  ];
  const governanceProtectionScore = round3(clamp(1 - protectionScores.reduce((s, v) => s + v, 0) / protectionScores.length, 0, 1));

  return {
    equilibriumDriftRollback,
    crossLayerInstabilityShutdown,
    confidenceInflationSuppression,
    recursiveInfluenceSuppression,
    unstableGovernanceBlockade,
    causalInconsistencyRollback,
    contradictionCascadeProtection,
    equilibriumDriftScore,
    crossLayerInstabilityScore,
    confidenceInflationScore,
    recursiveInfluenceScore,
    unstableGovernanceScore,
    causalInconsistencyScore,
    contradictionCascadeScore,
    governanceProtectionScore,
  };
}

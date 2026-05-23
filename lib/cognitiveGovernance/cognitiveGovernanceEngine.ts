/**
 * P6.8 — Unified cognitive governance engine orchestration.
 */

import type { AutonomousCommerceReasoningGraphMeta } from "@/lib/commerceReasoningGraph/commerceReasoningGraphTelemetry";
import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import {
  computeCognitiveGovernanceBalance,
  computeCognitiveGovernanceBlendInfluence,
  type CognitiveGovernanceBalanceResult,
  type CognitiveGovernanceBlendInfluence,
} from "@/lib/cognitiveGovernance/cognitiveGovernanceBalancer";
import {
  buildCognitiveGovernanceSignalBundle,
  computeCognitiveGovernanceConfidence,
  type CognitiveGovernanceSignalBundle,
} from "@/lib/cognitiveGovernance/cognitiveGovernanceConfidence";
import { detectCognitiveGovernanceContradictions, type CognitiveGovernanceContradictionResult } from "@/lib/cognitiveGovernance/cognitiveGovernanceContradictions";
import { detectCognitiveGovernanceSignals, type CognitiveGovernanceDetection } from "@/lib/cognitiveGovernance/cognitiveGovernanceDetection";
import { synthesizeUnifiedCognitiveGovernanceState } from "@/lib/cognitiveGovernance/cognitiveGovernanceFusion";
import { computeCognitiveGovernanceGovernors, type CognitiveGovernanceGovernorsResult } from "@/lib/cognitiveGovernance/cognitiveGovernanceGovernors";
import type { UnifiedCognitiveGovernanceProfile } from "@/lib/cognitiveGovernance/cognitiveGovernanceProfiles";
import { computeCognitiveGovernanceStabilization } from "@/lib/cognitiveGovernance/cognitiveGovernanceStabilization";

export type CognitiveGovernanceEngineResult = {
  signals: CognitiveGovernanceSignalBundle;
  detection: CognitiveGovernanceDetection;
  governors: CognitiveGovernanceGovernorsResult;
  contradictions: CognitiveGovernanceContradictionResult;
  balance: CognitiveGovernanceBalanceResult;
  influence: CognitiveGovernanceBlendInfluence;
  governanceScore: number;
  anomalies: string[];
};

export function runCognitiveGovernanceEngine(args: {
  reasoningGraph: AutonomousCommerceReasoningGraphMeta;
  commerceDecision: CommerceDecisionIntelligenceMeta;
  marketReality: MarketRealityIntelligenceMeta;
  memoryless: MemorylessCommerceLearningMeta;
  strategic: AdaptiveStrategicRankingMeta;
  governance: IntentGovernanceMeta;
  profile: UnifiedCognitiveGovernanceProfile;
}): CognitiveGovernanceEngineResult {
  const governors = computeCognitiveGovernanceGovernors({
    reasoningGraph: args.reasoningGraph,
    commerceDecision: args.commerceDecision,
    marketReality: args.marketReality,
    memoryless: args.memoryless,
    strategic: args.strategic,
    governance: args.governance,
  });

  const detection = detectCognitiveGovernanceSignals({
    reasoningGraph: args.reasoningGraph,
    governors,
    governance: args.governance,
  });

  const stabilization = computeCognitiveGovernanceStabilization({
    reasoningGraph: args.reasoningGraph,
    commerceDecision: args.commerceDecision,
    governors,
    detection,
  });

  const state = synthesizeUnifiedCognitiveGovernanceState({
    reasoningGraph: args.reasoningGraph,
    governors,
    detection,
    stabilization,
  });

  const signals = buildCognitiveGovernanceSignalBundle(state);

  const contradictions = detectCognitiveGovernanceContradictions({
    state,
    detection,
    governors,
    reasoningGraph: args.reasoningGraph,
  });

  let governanceDampen = 1;
  if (args.governance.anomalyDetected) governanceDampen = 0.88;

  const governanceConfidence = computeCognitiveGovernanceConfidence({
    signals,
    reasoningGraph: args.reasoningGraph,
    detection,
    contradictions,
    governanceDampen,
  });

  const balance = computeCognitiveGovernanceBalance({
    signals,
    governanceConfidence,
    governance: args.governance,
    reasoningGraph: args.reasoningGraph,
    detection,
    governors,
    contradictions,
    profile: args.profile,
  });

  const influence = computeCognitiveGovernanceBlendInfluence({
    signals,
    detection,
    governors,
    balance,
    profile: args.profile,
  });

  const anomalies: string[] = [];
  if (args.profile.requiresGovernancePass && args.governance.anomalyDetected) anomalies.push("governance_gate");
  if (args.profile.requiresGraphStable && !balance.graphStable) anomalies.push("graph_unstable");
  if (governors.crossLayerInstabilityShutdown) anomalies.push("cross_layer_shutdown");
  if (governors.unstableGovernanceBlockade) anomalies.push("governance_blockade");
  if (contradictions.contradictionCount >= 3) anomalies.push("contradiction_escalation");
  if (influence.governanceDelta > args.profile.maxDelta) anomalies.push("delta_exceeded");
  if (governanceConfidence < 0.3) anomalies.push("low_confidence");

  const governanceScore = Math.min(
    100,
    Math.round(balance.balanceScore * 0.45 + governanceConfidence * 35 + (100 - anomalies.length * 10) * 0.15)
  );

  return { signals, detection, governors, contradictions, balance, influence, governanceScore, anomalies };
}

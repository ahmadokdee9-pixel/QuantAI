/**
 * P6.7 — Commerce reasoning graph engine orchestration.
 */

import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import {
  computeCommerceReasoningGraphBalance,
  computeCommerceReasoningGraphBlendInfluence,
  type CommerceReasoningGraphBalanceResult,
  type CommerceReasoningGraphBlendInfluence,
} from "@/lib/commerceReasoningGraph/commerceReasoningGraphBalancer";
import {
  buildCommerceReasoningGraphSignalBundle,
  computeCommerceReasoningGraphConfidence,
  type CommerceReasoningGraphSignalBundle,
} from "@/lib/commerceReasoningGraph/commerceReasoningGraphConfidence";
import { detectCommerceReasoningGraphContradictions, type CommerceReasoningGraphContradictionResult } from "@/lib/commerceReasoningGraph/commerceReasoningGraphContradictions";
import { detectCommerceReasoningGraphSignals, type CommerceReasoningGraphDetection } from "@/lib/commerceReasoningGraph/commerceReasoningGraphDetection";
import { synthesizeUnifiedCommerceReasoningGraphState } from "@/lib/commerceReasoningGraph/commerceReasoningGraphFusion";
import { buildCommerceReasoningGraphPath } from "@/lib/commerceReasoningGraph/commerceReasoningGraphPaths";
import type { AutonomousCommerceReasoningGraphProfile } from "@/lib/commerceReasoningGraph/commerceReasoningGraphProfiles";
import { computeCommerceReasoningGraphStabilization } from "@/lib/commerceReasoningGraph/commerceReasoningGraphStabilization";

export type CommerceReasoningGraphEngineResult = {
  signals: CommerceReasoningGraphSignalBundle;
  detection: CommerceReasoningGraphDetection;
  contradictions: CommerceReasoningGraphContradictionResult;
  balance: CommerceReasoningGraphBalanceResult;
  influence: CommerceReasoningGraphBlendInfluence;
  graphScore: number;
  anomalies: string[];
};

export function runCommerceReasoningGraphEngine(args: {
  intent: IntentCognitionMeta;
  multiObjective: MultiObjectiveCommerceMeta;
  strategic: AdaptiveStrategicRankingMeta;
  memoryless: MemorylessCommerceLearningMeta;
  marketReality: MarketRealityIntelligenceMeta;
  commerceDecision: CommerceDecisionIntelligenceMeta;
  governance: IntentGovernanceMeta;
  profile: AutonomousCommerceReasoningGraphProfile;
}): CommerceReasoningGraphEngineResult {
  const path = buildCommerceReasoningGraphPath({
    intent: args.intent,
    multiObjective: args.multiObjective,
    strategic: args.strategic,
    memoryless: args.memoryless,
    marketReality: args.marketReality,
    commerceDecision: args.commerceDecision,
  });

  const detection = detectCommerceReasoningGraphSignals({
    path,
    strategic: args.strategic,
    memoryless: args.memoryless,
    marketReality: args.marketReality,
    commerceDecision: args.commerceDecision,
  });

  const stabilization = computeCommerceReasoningGraphStabilization({
    path,
    memoryless: args.memoryless,
    commerceDecision: args.commerceDecision,
    detection,
  });

  const state = synthesizeUnifiedCommerceReasoningGraphState({ path, detection, stabilization });
  const signals = buildCommerceReasoningGraphSignalBundle(state);

  const contradictions = detectCommerceReasoningGraphContradictions({
    state,
    detection,
    commerceDecision: args.commerceDecision,
  });

  let governanceDampen = 1;
  if (args.governance.anomalyDetected) governanceDampen = 0.88;

  const graphConfidence = computeCommerceReasoningGraphConfidence({
    signals,
    commerceDecision: args.commerceDecision,
    detection,
    contradictions,
    governanceDampen,
  });

  const balance = computeCommerceReasoningGraphBalance({
    signals,
    graphConfidence,
    governance: args.governance,
    commerceDecision: args.commerceDecision,
    detection,
    contradictions,
    profile: args.profile,
  });

  const influence = computeCommerceReasoningGraphBlendInfluence({
    signals,
    detection,
    balance,
    profile: args.profile,
  });

  const anomalies: string[] = [];
  if (args.profile.requiresGovernancePass && args.governance.anomalyDetected) anomalies.push("governance_gate");
  if (args.profile.requiresDecisionStable && !balance.decisionStable) anomalies.push("decision_unstable");
  if (contradictions.contradictionCount >= 3) anomalies.push("contradiction_escalation");
  if (influence.graphDelta > args.profile.maxDelta) anomalies.push("delta_exceeded");
  if (graphConfidence < 0.3) anomalies.push("low_confidence");

  const graphScore = Math.min(
    100,
    Math.round(balance.balanceScore * 0.45 + graphConfidence * 35 + (100 - anomalies.length * 10) * 0.15)
  );

  return { signals, detection, contradictions, balance, influence, graphScore, anomalies };
}

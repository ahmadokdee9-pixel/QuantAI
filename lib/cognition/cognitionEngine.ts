/**
 * P6.0 — Unified commerce cognition engine orchestration.
 */

import type { BehavioralCommerceMeta } from "@/lib/behavioral/behavioralTelemetry";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import {
  computeCognitionBalance,
  computeCognitionBlendInfluence,
  resolveCognitionRoutingLane,
  type CognitionBalanceResult,
  type CognitionBlendInfluence,
} from "@/lib/cognition/cognitionBalancer";
import {
  computeCognitionConfidence,
  computeCognitionScore,
  computeCognitionStability,
} from "@/lib/cognition/cognitionConfidence";
import { detectCognitionContradictions, type CognitionContradictionResult } from "@/lib/cognition/cognitionContradictions";
import { synthesizeUnifiedCommerceState, type UnifiedCommerceState } from "@/lib/cognition/cognitionFusion";
import { buildUnifiedCognitionGraph, type UnifiedCognitionGraph } from "@/lib/cognition/cognitionGraph";
import type { CognitionProfile } from "@/lib/cognition/cognitionProfiles";

export type CognitionEngineResult = {
  state: UnifiedCommerceState;
  graph: UnifiedCognitionGraph;
  contradictions: CognitionContradictionResult;
  balance: CognitionBalanceResult;
  influence: CognitionBlendInfluence;
  cognitionScore: number;
  anomalies: string[];
};

export function runCognitionEngine(args: {
  reasoning: AdaptiveReasoningMeta;
  decision: DecisionIntelligenceMeta;
  strategy: StrategyIntelligenceMeta;
  market: MarketIntelligenceMeta;
  behavioral: BehavioralCommerceMeta;
  governance: IntentGovernanceMeta;
  profile: CognitionProfile;
}): CognitionEngineResult {
  const state = synthesizeUnifiedCommerceState(args);
  const graph = buildUnifiedCognitionGraph({ state, profile: args.profile });
  const contradictions = detectCognitionContradictions({ state, ...args });

  let governanceDampen = 1;
  if (args.governance.anomalyDetected) governanceDampen = 0.88;

  const cognitionConfidence = computeCognitionConfidence({ state, graph, contradictions, governanceDampen });
  const cognitionStability = computeCognitionStability({ state, graph, contradictions, cognitionConfidence });

  let routingLane = resolveCognitionRoutingLane({
    state,
    contradictions,
    reasoning: args.reasoning,
    strategy: args.strategy,
    market: args.market,
    behavioral: args.behavioral,
    governance: args.governance,
  });

  if (!args.profile.allowsMutation && routingLane !== "replay-protect" && routingLane !== "stabilize") {
    routingLane = "hold";
  }

  const balance: CognitionBalanceResult = {
    routingLane,
    governanceDampen,
    behavioralStable: !args.behavioral.rollbackTriggered && args.behavioral.analytics.replayIntegrityAnalytics >= 50,
    marketStable: !args.market.rollbackTriggered && args.market.analytics.replayIntegrityAnalytics >= 50,
    strategyStable:
      !args.strategy.rollbackTriggered && args.strategy.replayIntegrity >= 50 && args.strategy.strategyScore >= 40,
    balanceScore: Math.min(
      100,
      Math.round(cognitionConfidence * 40 + cognitionStability * 30 + graph.graphIntegrity * 0.15 + state.conversionProbability * 15)
    ),
    cognitionConfidence,
    cognitionStability,
  };

  const influence = computeCognitionBlendInfluence({ state, balance, profile: args.profile });

  const anomalies: string[] = [];
  if (args.profile.requiresGovernancePass && args.governance.anomalyDetected) anomalies.push("governance_gate");
  if (args.profile.requiresMarketStable && !balance.marketStable) anomalies.push("market_unstable");
  if (args.profile.requiresBehavioralStable && !balance.behavioralStable) anomalies.push("behavioral_unstable");
  if (contradictions.contradictionCount >= 3) anomalies.push("contradiction_escalation");
  if (influence.cognitionDelta > args.profile.maxDelta) anomalies.push("delta_exceeded");
  if (cognitionConfidence < 0.3) anomalies.push("low_confidence");

  const cognitionScore = computeCognitionScore({
    cognitionConfidence,
    cognitionStability,
    graph,
    anomalyCount: anomalies.length,
  });

  return { state, graph, contradictions, balance, influence, cognitionScore, anomalies };
}

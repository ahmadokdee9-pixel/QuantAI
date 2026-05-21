/**
 * P6.0 — Cross-layer cognition balancer (bounded unified influence).
 */

import type { BehavioralCommerceMeta } from "@/lib/behavioral/behavioralTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import type { CognitionContradictionResult } from "@/lib/cognition/cognitionContradictions";
import type { UnifiedCommerceState } from "@/lib/cognition/cognitionFusion";
import type { UnifiedCognitionGraph } from "@/lib/cognition/cognitionGraph";
import type { CognitionProfile } from "@/lib/cognition/cognitionProfiles";
import type { CognitionRoutingLane } from "@/lib/cognition/cognitionFlags";

export type CognitionBalanceResult = {
  routingLane: CognitionRoutingLane;
  governanceDampen: number;
  behavioralStable: boolean;
  marketStable: boolean;
  strategyStable: boolean;
  balanceScore: number;
  cognitionConfidence: number;
  cognitionStability: number;
};

export type CognitionBlendInfluence = {
  cognitionDelta: number;
  reasoningInfluence: number;
  strategyInfluence: number;
  marketInfluence: number;
  behavioralInfluence: number;
  trustValueInfluence: number;
  conversionInfluence: number;
  continuityStrength: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveCognitionRoutingLane(args: {
  state: UnifiedCommerceState;
  contradictions: CognitionContradictionResult;
  reasoning: AdaptiveReasoningMeta;
  strategy: StrategyIntelligenceMeta;
  market: MarketIntelligenceMeta;
  behavioral: BehavioralCommerceMeta;
  governance: IntentGovernanceMeta;
}): CognitionRoutingLane {
  const { state, contradictions, reasoning, strategy, market, behavioral, governance } = args;

  if (governance.anomalyDetected || reasoning.rollbackTriggered) return "stabilize";
  if (behavioral.rollbackTriggered || market.rollbackTriggered || strategy.rollbackTriggered) return "replay-protect";
  if (contradictions.contradictionCount >= 2) return "contradiction-check";
  if (behavioral.buyingFriction >= 0.55 || behavioral.decisionHesitation >= 0.55) return "behavior-check";
  if (state.conversionProbability < 0.35) return "conversion-check";
  if (strategy.momentumConfidence < 0.25 && market.marketMomentum < 0.3) return "momentum-check";
  if (strategy.routingLane === "compare" || behavioral.routingLane === "comparison-fatigue") return "compare";
  if (strategy.routingLane === "reinforce") return "reinforce";
  if (strategy.routingLane === "strategic-balance") return "strategic-balance";
  if (state.conversionProbability >= 0.45 && contradictions.contradictionCount === 0) return "cognition-safe";
  return "hold";
}

export function computeCognitionBalance(args: {
  state: UnifiedCommerceState;
  graph: UnifiedCognitionGraph;
  cognitionConfidence: number;
  cognitionStability: number;
  governance: IntentGovernanceMeta;
  strategy: StrategyIntelligenceMeta;
  market: MarketIntelligenceMeta;
  behavioral: BehavioralCommerceMeta;
  profile: CognitionProfile;
}): CognitionBalanceResult {
  const { state, graph, cognitionConfidence, cognitionStability, governance, strategy, market, behavioral, profile } =
    args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;

  const behavioralStable = !behavioral.rollbackTriggered && behavioral.analytics.replayIntegrityAnalytics >= 50;
  const marketStable = !market.rollbackTriggered && market.analytics.replayIntegrityAnalytics >= 50;
  const strategyStable = !strategy.rollbackTriggered && strategy.replayIntegrity >= 50 && strategy.strategyScore >= 40;

  let routingLane = resolveCognitionRoutingLane({
    state,
    contradictions: { contradictionCount: 0, contradictions: [], contradictionSeverity: 0 },
    reasoning: { rollbackTriggered: false } as AdaptiveReasoningMeta,
    strategy,
    market,
    behavioral,
    governance,
  });

  if (!profile.allowsMutation && routingLane !== "replay-protect" && routingLane !== "stabilize") {
    routingLane = "hold";
  }

  const balanceScore = Math.min(
    100,
    Math.round(cognitionConfidence * 40 + cognitionStability * 30 + graph.graphIntegrity * 0.15 + state.conversionProbability * 15)
  );

  return {
    routingLane,
    governanceDampen,
    behavioralStable,
    marketStable,
    strategyStable,
    balanceScore,
    cognitionConfidence,
    cognitionStability,
  };
}

export function computeCognitionBlendInfluence(args: {
  state: UnifiedCommerceState;
  balance: CognitionBalanceResult;
  profile: CognitionProfile;
}): CognitionBlendInfluence {
  const { state, balance, profile } = args;
  const damp = balance.governanceDampen;

  const reasoningInfluence = clamp(state.reasoningFusion * profile.maxReasoningInfluence * damp, 0, profile.maxReasoningInfluence);
  const strategyInfluence = clamp(state.strategyFusion * profile.maxStrategyInfluence * damp, 0, profile.maxStrategyInfluence);
  const marketInfluence = clamp(state.marketStateFusion * profile.maxMarketInfluence * damp, 0, profile.maxMarketInfluence);
  const behavioralInfluence = clamp(
    state.behavioralReadinessFusion * profile.maxBehavioralInfluence * damp,
    0,
    profile.maxBehavioralInfluence
  );
  const trustValueInfluence = clamp(state.trustValueBalance * profile.maxDelta * damp, 0, profile.maxDelta);
  const conversionInfluence = clamp(state.conversionProbability * profile.maxDelta * 0.9 * damp, 0, profile.maxDelta);
  const continuityStrength = clamp(state.rankingContinuity * profile.maxDelta * 0.7, 0, profile.maxDelta);

  const laneScale =
    balance.routingLane === "reinforce" || balance.routingLane === "cognition-safe"
      ? 1.05
      : balance.routingLane === "strategic-balance"
        ? 1
        : balance.routingLane === "behavior-check" ||
            balance.routingLane === "contradiction-check" ||
            balance.routingLane === "conversion-check" ||
            balance.routingLane === "momentum-check"
          ? 0.75
          : 0.95;

  const cognitionDelta = clamp(
    (reasoningInfluence +
      strategyInfluence +
      marketInfluence +
      behavioralInfluence +
      trustValueInfluence +
      conversionInfluence +
      continuityStrength) *
      0.08 *
      laneScale,
    0,
    profile.maxDelta
  );

  return {
    cognitionDelta: round3(cognitionDelta),
    reasoningInfluence: round3(reasoningInfluence),
    strategyInfluence: round3(strategyInfluence),
    marketInfluence: round3(marketInfluence),
    behavioralInfluence: round3(behavioralInfluence),
    trustValueInfluence: round3(trustValueInfluence),
    conversionInfluence: round3(conversionInfluence),
    continuityStrength: round3(continuityStrength),
  };
}

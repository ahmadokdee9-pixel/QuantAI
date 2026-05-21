/**
 * P5.7 — Strategy balancer (bounded strategic weights).
 */

import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import type { StrategicCommerceGraph } from "@/lib/strategy/strategyGraph";
import type { StrategyProfile } from "@/lib/strategy/strategyProfiles";
import type { StrategyRoutingLane } from "@/lib/strategy/strategyFlags";
import type { StrategySignalBundle } from "@/lib/strategy/strategySignals";
import type { MarketPositioning } from "@/lib/strategy/strategyMarket";

export type StrategyBalanceResult = {
  routingLane: StrategyRoutingLane;
  governanceDampen: number;
  decisionStable: boolean;
  reasoningStable: boolean;
  memoryContinuity: number;
  balanceScore: number;
  strategyConfidence: number;
};

export type StrategyBlendInfluence = {
  strategyDelta: number;
  strategicTrust: number;
  strategicValue: number;
  premiumPositioning: number;
  categoryDominance: number;
  recommendationHierarchy: number;
  comparisonIntelligence: number;
  merchantStrength: number;
  momentumConfidence: number;
  continuityStrength: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveStrategyRoutingLane(args: {
  signals: StrategySignalBundle;
  decision: DecisionIntelligenceMeta;
  reasoning: AdaptiveReasoningMeta;
  governance: IntentGovernanceMeta;
  orchestration: IntentOrchestrationMeta;
  market: MarketPositioning;
}): StrategyRoutingLane {
  const { signals, decision, reasoning, governance, orchestration, market } = args;

  if (governance.anomalyDetected || orchestration.monitoring.orchestrationInstability) return "stabilize";
  if (decision.rollbackTriggered || decision.replayIntegrity < 60) return "replay-protect";
  if (signals.conversionConfidence < 0.35) return "conversion-check";
  if (signals.momentumConfidence < 0.2 && market.priceSpread > 0.5) return "momentum-check";
  if (signals.categoryDominance >= 0.6 && market.categoryFocus >= 0.6) return "category-priority";
  if (signals.comparisonIntelligence >= 0.4 || decision.routingLane === "compare") return "compare";
  if (reasoning.routingLane === "reinforce") return "reinforce";
  if (signals.strategicTrust >= 0.2 && signals.strategicValue >= 0.15) return "strategic-balance";
  if (signals.commerceStability >= 0.25) return "commerce-safe";
  return "hold";
}

export function computeStrategyBalance(args: {
  signals: StrategySignalBundle;
  graph: StrategicCommerceGraph;
  strategyConfidence: number;
  governance: IntentGovernanceMeta;
  memory: IntentMemoryMeta;
  decision: DecisionIntelligenceMeta;
  reasoning: AdaptiveReasoningMeta;
  orchestration: IntentOrchestrationMeta;
  market: MarketPositioning;
  profile: StrategyProfile;
}): StrategyBalanceResult {
  const { signals, graph, strategyConfidence, governance, memory, decision, reasoning, orchestration, market, profile } =
    args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;

  const decisionStable = !decision.rollbackTriggered && decision.replayIntegrity >= 50 && decision.decisionScore >= 40;
  const reasoningStable = !reasoning.rollbackTriggered && reasoning.replayIntegrity >= 50;
  const memoryContinuity = clamp(memory.continuityScore / 100, 0, 1);

  let routingLane = resolveStrategyRoutingLane({ signals, decision, reasoning, governance, orchestration, market });

  if (!profile.allowsMutation) routingLane = "hold";

  const balanceScore = Math.min(
    100,
    Math.round(
      strategyConfidence * 40 + graph.graphIntegrity * 0.2 + decision.decisionScore * 0.15 + signals.conversionConfidence * 15
    )
  );

  return {
    routingLane,
    governanceDampen,
    decisionStable,
    reasoningStable,
    memoryContinuity,
    balanceScore,
    strategyConfidence,
  };
}

export function computeStrategyBlendInfluence(args: {
  signals: StrategySignalBundle;
  balance: StrategyBalanceResult;
  profile: StrategyProfile;
}): StrategyBlendInfluence {
  const { signals, balance, profile } = args;
  const damp = balance.governanceDampen;

  const strategicTrust = clamp(
    signals.strategicTrust * profile.maxConversionAmplification * damp,
    0,
    profile.maxConversionAmplification
  );
  const strategicValue = clamp(signals.strategicValue * profile.maxDelta * damp, 0, profile.maxDelta);
  const premiumPositioning = clamp(
    signals.premiumPositioning * profile.maxDominanceAmplification * damp,
    0,
    profile.maxDominanceAmplification
  );
  const categoryDominance = clamp(
    signals.categoryDominance * profile.maxDominanceAmplification * 0.8 * damp,
    0,
    profile.maxDominanceAmplification
  );
  const recommendationHierarchy = clamp(
    signals.recommendationHierarchy * profile.maxConversionAmplification * 0.9 * damp,
    0,
    profile.maxConversionAmplification
  );
  const comparisonIntelligence = clamp(
    signals.comparisonIntelligence * profile.maxComparisonAmplification * damp,
    0,
    profile.maxComparisonAmplification
  );
  const merchantStrength = clamp(
    signals.merchantStrength * profile.maxConversionAmplification * 0.7 * damp,
    0,
    profile.maxConversionAmplification
  );
  const momentumConfidence = clamp(
    signals.momentumConfidence * profile.maxMomentumInfluence * damp,
    0,
    profile.maxMomentumInfluence
  );
  const continuityStrength = clamp(
    signals.rankingContinuity * balance.memoryContinuity * profile.maxDelta,
    0,
    profile.maxDelta
  );

  const laneScale =
    balance.routingLane === "reinforce" || balance.routingLane === "category-priority"
      ? 1.05
      : balance.routingLane === "strategic-balance" || balance.routingLane === "commerce-safe"
        ? 1
        : balance.routingLane === "conversion-check" || balance.routingLane === "momentum-check"
          ? 0.8
          : 0.95;

  const strategyDelta = clamp(
    (strategicTrust +
      strategicValue +
      premiumPositioning +
      categoryDominance +
      recommendationHierarchy +
      comparisonIntelligence +
      merchantStrength +
      momentumConfidence +
      continuityStrength) *
      0.08 *
      laneScale,
    0,
    profile.maxDelta
  );

  return {
    strategyDelta: round3(strategyDelta),
    strategicTrust: round3(strategicTrust),
    strategicValue: round3(strategicValue),
    premiumPositioning: round3(premiumPositioning),
    categoryDominance: round3(categoryDominance),
    recommendationHierarchy: round3(recommendationHierarchy),
    comparisonIntelligence: round3(comparisonIntelligence),
    merchantStrength: round3(merchantStrength),
    momentumConfidence: round3(momentumConfidence),
    continuityStrength: round3(continuityStrength),
  };
}

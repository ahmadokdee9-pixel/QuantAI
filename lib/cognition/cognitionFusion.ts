/**
 * P6.0 — Unified commerce state synthesis (cross-layer fusion).
 */

import type { BehavioralCommerceMeta } from "@/lib/behavioral/behavioralTelemetry";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";

export type UnifiedCommerceState = {
  reasoningFusion: number;
  strategyFusion: number;
  marketStateFusion: number;
  behavioralReadinessFusion: number;
  trustValueBalance: number;
  conversionProbability: number;
  rankingContinuity: number;
  replayIntegrity: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function synthesizeUnifiedCommerceState(args: {
  reasoning: AdaptiveReasoningMeta;
  decision: DecisionIntelligenceMeta;
  strategy: StrategyIntelligenceMeta;
  market: MarketIntelligenceMeta;
  behavioral: BehavioralCommerceMeta;
}): UnifiedCommerceState {
  const { reasoning, decision, strategy, market, behavioral } = args;

  const reasoningFusion = round3(
    reasoning.reasoningConfidence * 0.4 + reasoning.analytics.commerceStabilityAnalytics * 0.01 * 0.3 + decision.decisionConfidence * 0.3
  );
  const strategyFusion = round3(
    strategy.strategyConfidence * 0.4 + strategy.strategicTrust * 0.3 + strategy.strategicValue * 0.3
  );
  const marketStateFusion = round3(
    market.marketConfidence * 0.35 + market.marketTrust * 0.35 + market.analytics.pricingAnalytics * 0.01 * 0.3
  );
  const behavioralReadinessFusion = round3(
    behavioral.conversionReadiness * 0.4 +
      behavioral.trustMomentum * 0.3 +
      (1 - behavioral.buyingFriction) * 0.15 +
      behavioral.analytics.aggregateAnalytics * 0.01 * 0.15
  );
  const trustValueBalance = round3(
    (decision.trustDecision + decision.valueDecision + strategy.strategicTrust + strategy.strategicValue) * 0.25
  );
  const conversionProbability = round3(
    behavioral.conversionReadiness * 0.3 +
      strategy.conversionConfidence * 0.25 +
      decision.analytics.purchaseQualityAnalytics * 0.01 * 0.2 +
      market.analytics.conversionMarketAnalytics * 0.01 * 0.15 +
      trustValueBalance * 0.1
  );
  const rankingContinuity = round3(
    strategy.continuityStrength * 0.35 + market.analytics.rankingContinuityAnalytics * 0.01 * 0.35 + behavioral.analytics.rankingContinuityAnalytics * 0.01 * 0.3
  );
  const replayIntegrity = round3(
    strategy.replayIntegrity * 0.01 * market.analytics.replayIntegrityAnalytics * 0.01 * behavioral.analytics.replayIntegrityAnalytics * 0.01
  );

  return {
    reasoningFusion: clamp(reasoningFusion, 0, 1),
    strategyFusion: clamp(strategyFusion, 0, 1),
    marketStateFusion: clamp(marketStateFusion, 0, 1),
    behavioralReadinessFusion: clamp(behavioralReadinessFusion, 0, 1),
    trustValueBalance: clamp(trustValueBalance, 0, 1),
    conversionProbability: clamp(conversionProbability, 0, 1),
    rankingContinuity: clamp(rankingContinuity, 0, 1),
    replayIntegrity: clamp(replayIntegrity, 0, 1),
  };
}

/**
 * P5.9 — Conversion readiness scoring (deterministic).
 */

import type { BuyingFriction } from "@/lib/behavioral/behavioralFriction";
import type { ComparisonFatigue } from "@/lib/behavioral/behavioralComparisonFatigue";
import type { DecisionHesitation } from "@/lib/behavioral/behavioralHesitation";
import type { TrustMomentumBehavior } from "@/lib/behavioral/behavioralTrustMomentum";
import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";

export type ConversionReadiness = {
  conversionReadiness: number;
  readinessLane: "ready" | "warming" | "blocked";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateConversionReadiness(args: {
  friction: BuyingFriction;
  hesitation: DecisionHesitation;
  fatigue: ComparisonFatigue;
  trustMomentum: TrustMomentumBehavior;
  market: MarketIntelligenceMeta;
  strategy: StrategyIntelligenceMeta;
}): ConversionReadiness {
  const { friction, hesitation, fatigue, trustMomentum, market, strategy } = args;

  const conversionReadiness = clamp(
    strategy.conversionConfidence * 0.25 +
      trustMomentum.trustMomentum * 0.2 +
      market.analytics.conversionMarketAnalytics * 0.01 * 0.15 +
      (1 - friction.buyingFriction) * 0.15 +
      (1 - hesitation.decisionHesitation) * 0.15 +
      (1 - fatigue.comparisonFatigue) * 0.1,
    0,
    1
  );

  let readinessLane: ConversionReadiness["readinessLane"] = "warming";
  if (conversionReadiness >= 0.55 && friction.frictionLane !== "high") readinessLane = "ready";
  else if (conversionReadiness < 0.3 || hesitation.hesitationLane === "hesitant") readinessLane = "blocked";

  return {
    conversionReadiness: Math.round(conversionReadiness * 1000) / 1000,
    readinessLane,
  };
}

/**
 * P5.8 — Market volatility cognition (deterministic).
 */

import type { MarketPricing } from "@/lib/market/marketPricing";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";

export type MarketVolatility = {
  marketVolatility: number;
  volatilityLane: "low" | "moderate" | "high";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateMarketVolatility(args: {
  pricing: MarketPricing;
  strategy: StrategyIntelligenceMeta;
}): MarketVolatility {
  const { pricing, strategy } = args;
  const marketVolatility = clamp(pricing.priceSpread * 0.55 + (1 - pricing.pricingRealism) * 0.25 + strategy.strategyDelta * 0.2, 0, 1);

  let volatilityLane: MarketVolatility["volatilityLane"] = "low";
  if (marketVolatility >= 0.55) volatilityLane = "high";
  else if (marketVolatility >= 0.3) volatilityLane = "moderate";

  return {
    marketVolatility: Math.round(marketVolatility * 1000) / 1000,
    volatilityLane,
  };
}

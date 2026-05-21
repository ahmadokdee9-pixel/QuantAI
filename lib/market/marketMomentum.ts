/**
 * P5.8 — Commerce momentum cognition (deterministic).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type MarketMomentum = {
  momentumScore: number;
  momentumLane: "rising" | "stable" | "cooling";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateMarketMomentum(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
  strategy: StrategyIntelligenceMeta;
}): MarketMomentum {
  const { products, canonicalQuery, strategy } = args;
  const prices = products.slice(0, 5).map((p) => p.price).filter((p) => Number.isFinite(p) && p > 0);
  const spread = prices.length >= 2 ? (Math.max(...prices) - Math.min(...prices)) / Math.max(...prices) : 0;

  let momentumLane: MarketMomentum["momentumLane"] = "stable";
  if (canonicalQuery.intent.urgency01 >= 0.5 || strategy.momentumConfidence >= 0.4) momentumLane = "rising";
  else if (spread > 0.6) momentumLane = "cooling";

  const momentumScore = clamp(
    strategy.momentumConfidence * 0.4 + strategy.analytics.momentumAnalytics * 0.01 + spread * 0.25 + (momentumLane === "rising" ? 0.15 : 0),
    0,
    1
  );

  return {
    momentumScore: Math.round(momentumScore * 1000) / 1000,
    momentumLane,
  };
}

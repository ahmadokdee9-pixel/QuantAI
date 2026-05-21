/**
 * P5.8 — Supply-demand pressure synthesis (deterministic).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { MarketMomentum } from "@/lib/market/marketMomentum";
import type { MarketPricing } from "@/lib/market/marketPricing";
import type { QuantProduct } from "@/lib/shoppingScore";

export type MarketPressure = {
  marketPressure: number;
  pressureLane: "supply-heavy" | "balanced" | "demand-heavy";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateMarketPressure(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
  pricing: MarketPricing;
  momentum: MarketMomentum;
}): MarketPressure {
  const { products, canonicalQuery, pricing, momentum } = args;
  const supplySignal = clamp(products.length / 10, 0, 1);
  const demandSignal = clamp(canonicalQuery.intent.urgency01 * 0.5 + momentum.momentumScore * 0.5, 0, 1);

  let pressureLane: MarketPressure["pressureLane"] = "balanced";
  if (demandSignal - supplySignal > 0.2) pressureLane = "demand-heavy";
  else if (supplySignal - demandSignal > 0.2) pressureLane = "supply-heavy";

  const marketPressure = clamp(
    Math.abs(demandSignal - supplySignal) * 0.4 + pricing.priceSpread * 0.3 + momentum.momentumScore * 0.3,
    0,
    1
  );

  return {
    marketPressure: Math.round(marketPressure * 1000) / 1000,
    pressureLane,
  };
}

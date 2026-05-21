/**
 * P5.9 — Buying friction intelligence (deterministic; query/tray signals only).
 */

import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type BuyingFriction = {
  buyingFriction: number;
  frictionLane: "low" | "moderate" | "high";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateBuyingFriction(args: {
  products: QuantProduct[];
  market: MarketIntelligenceMeta;
  strategy: StrategyIntelligenceMeta;
}): BuyingFriction {
  const { products, market, strategy } = args;
  const prices = products.slice(0, 5).map((p) => p.price).filter((p) => Number.isFinite(p) && p > 0);
  const spread = prices.length >= 2 ? (Math.max(...prices) - Math.min(...prices)) / Math.max(...prices) : 0;

  const buyingFriction = clamp(
    market.marketVolatility * 0.35 +
      spread * 0.25 +
      (1 - strategy.conversionConfidence) * 0.2 +
      market.analytics.pricingAnalytics * 0.01 * 0.2,
    0,
    1
  );

  let frictionLane: BuyingFriction["frictionLane"] = "low";
  if (buyingFriction >= 0.55) frictionLane = "high";
  else if (buyingFriction >= 0.3) frictionLane = "moderate";

  return {
    buyingFriction: Math.round(buyingFriction * 1000) / 1000,
    frictionLane,
  };
}

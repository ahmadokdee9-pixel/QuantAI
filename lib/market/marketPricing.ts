/**
 * P5.8 — Pricing realism intelligence (deterministic).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { QuantProduct } from "@/lib/shoppingScore";

export type MarketPricing = {
  pricingRealism: number;
  priceSpread: number;
  premiumVsValue: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateMarketPricing(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
}): MarketPricing {
  const { products, canonicalQuery } = args;
  const prices = products.map((p) => p.price).filter((p) => Number.isFinite(p) && p > 0);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const priceSpread = max > 0 ? clamp((max - min) / max, 0, 1) : 0;

  let premiumVsValue = 0.5;
  if (canonicalQuery.intent.premium01 >= 0.5) premiumVsValue = 0.75;
  else if (canonicalQuery.budget.intent01 >= 0.5) premiumVsValue = 0.25;

  const pricingRealism = clamp(
    (1 - priceSpread * 0.35) * 0.5 + premiumVsValue * 0.3 + (prices.length >= 2 ? 0.2 : 0.1),
    0,
    1
  );

  return {
    pricingRealism: Math.round(pricingRealism * 1000) / 1000,
    priceSpread: Math.round(priceSpread * 1000) / 1000,
    premiumVsValue: Math.round(premiumVsValue * 1000) / 1000,
  };
}

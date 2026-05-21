/**
 * P5.7 — Market positioning evaluation (deterministic; no embeddings).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { QuantProduct } from "@/lib/shoppingScore";

export type MarketPositioning = {
  marketPositionScore: number;
  categoryFocus: number;
  priceSpread: number;
  positioningLane: "value" | "premium" | "balanced" | "compare";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateMarketPositioning(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
}): MarketPositioning {
  const { products, canonicalQuery } = args;
  const prices = products.map((p) => p.price).filter((p) => Number.isFinite(p) && p > 0);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const priceSpread = max > 0 ? clamp((max - min) / max, 0, 1) : 0;

  let positioningLane: MarketPositioning["positioningLane"] = "balanced";
  if (canonicalQuery.intent.primary === "market_compare" || canonicalQuery.marketMode === "hybrid_compare") {
    positioningLane = "compare";
  } else if (canonicalQuery.intent.premium01 >= 0.5) positioningLane = "premium";
  else if (canonicalQuery.budget.intent01 >= 0.5) positioningLane = "value";

  const categoryFocus = canonicalQuery.category !== "unknown" ? 0.75 : 0.45;
  const marketPositionScore = clamp(
    categoryFocus * 0.4 + priceSpread * 0.3 + (positioningLane === "compare" ? 0.3 : 0.15),
    0,
    1
  );

  return {
    marketPositionScore: Math.round(marketPositionScore * 1000) / 1000,
    categoryFocus: Math.round(categoryFocus * 1000) / 1000,
    priceSpread: Math.round(priceSpread * 1000) / 1000,
    positioningLane,
  };
}

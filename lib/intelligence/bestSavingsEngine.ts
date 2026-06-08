/**
 * Phase 40 — Best Savings Engine.
 * Search-level price spread and savings intelligence.
 */

import type { QuantProduct } from "@/lib/shoppingScore";

export type BestSavingsIntelligence = {
  version: 1;
  bestPrice: number;
  highestPrice: number;
  averagePrice: number;
  marketSpread: number;
  potentialSavings: number;
  bestPriceProductTitle: string | null;
  highestPriceProductTitle: string | null;
  headline: string;
  detailLine: string;
};

function roundPrice(n: number): number {
  return Math.round(n);
}

/** Compute search-level savings intelligence from tray prices. */
export function computeBestSavings(tray: QuantProduct[]): BestSavingsIntelligence {
  const priced = tray.filter((p) => p.price > 0);
  if (!priced.length) {
    return {
      version: 1,
      bestPrice: 0,
      highestPrice: 0,
      averagePrice: 0,
      marketSpread: 0,
      potentialSavings: 0,
      bestPriceProductTitle: null,
      highestPriceProductTitle: null,
      headline: "Price spread unavailable — insufficient priced results.",
      detailLine: "",
    };
  }

  const sorted = [...priced].sort((a, b) => a.price - b.price);
  const best = sorted[0]!;
  const highest = sorted[sorted.length - 1]!;
  const averagePrice = roundPrice(priced.reduce((sum, p) => sum + p.price, 0) / priced.length);
  const bestPrice = roundPrice(best.price);
  const highestPrice = roundPrice(highest.price);
  const potentialSavings = Math.max(0, highestPrice - bestPrice);
  const marketSpread = highestPrice > 0 ? Math.round((potentialSavings / highestPrice) * 100) : 0;

  return {
    version: 1,
    bestPrice,
    highestPrice,
    averagePrice,
    marketSpread,
    potentialSavings,
    bestPriceProductTitle: best.title,
    highestPriceProductTitle: highest.title,
    headline: `Best Price: €${bestPrice} · Highest Price: €${highestPrice} · Potential Savings: €${potentialSavings}`,
    detailLine: `Market spread ${marketSpread}% across ${priced.length} analyzed results (avg €${averagePrice}).`,
  };
}

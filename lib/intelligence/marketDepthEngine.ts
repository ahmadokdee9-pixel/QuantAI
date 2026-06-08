/**
 * Phase 42 — Market Depth Engine.
 * Low coverage reduces confidence but does not auto-block BUY READY.
 */

import type { MarketCoverageIntelligence } from "@/lib/intelligence/marketCoverageEngine";
import type { UniversalOfferGraph } from "@/lib/intelligence/universalOfferGraphEngine";
import type { QuantProduct } from "@/lib/shoppingScore";

export type MarketDepthIntelligence = {
  version: 1;
  merchantCount: number;
  priceDistributionSpread: number;
  marketMedian: number;
  marketSpreadPct: number;
  coverageQuality: number;
  marketCoverageScore: number;
  lowCoverage: boolean;
  confidencePenalty: number;
  headline: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Compute market depth — coverage affects confidence only. */
export function computeMarketDepth(args: {
  tray: QuantProduct[];
  coverage: MarketCoverageIntelligence;
  offerGraph?: UniversalOfferGraph;
}): MarketDepthIntelligence {
  const { tray, coverage, offerGraph } = args;
  const prices = tray.map((p) => p.price).filter((p) => p > 0);
  const merchantCount = coverage.merchantsScanned || new Set(tray.map((p) => p.store)).size;
  const marketMedian = prices.length
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : 0;
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const marketSpreadPct = maxP > 0 ? Math.round(((maxP - minP) / maxP) * 100) : 0;

  const coverageQuality = clamp(
    Math.round(coverage.coveragePct * 0.6 + (offerGraph?.searchDepthScore ?? 50) * 0.4),
    0,
    100
  );

  const marketCoverageScore = clamp(
    Math.round(merchantCount * 3 + coverageQuality * 0.5 + Math.min(20, tray.length)),
    0,
    100
  );

  const lowCoverage = coverageQuality < 45 || merchantCount < 3;
  const confidencePenalty = lowCoverage ? clamp(Math.round((45 - coverageQuality) * 0.3), 0, 12) : 0;

  return {
    version: 1,
    merchantCount,
    priceDistributionSpread: marketSpreadPct,
    marketMedian,
    marketSpreadPct,
    coverageQuality,
    marketCoverageScore,
    lowCoverage,
    confidencePenalty,
    headline: lowCoverage
      ? `Partial market depth — ${merchantCount} merchants, ${coverageQuality}% coverage quality.`
      : `Deep market scan — ${merchantCount} merchants, median €${marketMedian}, spread ${marketSpreadPct}%.`,
  };
}

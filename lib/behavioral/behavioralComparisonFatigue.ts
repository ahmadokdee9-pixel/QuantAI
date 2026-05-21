/**
 * P5.9 — Comparison fatigue signals (deterministic).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type ComparisonFatigue = {
  comparisonFatigue: number;
  fatigueLane: "fresh" | "moderate" | "fatigued";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateComparisonFatigue(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
  strategy: StrategyIntelligenceMeta;
}): ComparisonFatigue {
  const { products, canonicalQuery, strategy } = args;
  const compareMode =
    canonicalQuery.intent.primary === "market_compare" || canonicalQuery.marketMode === "hybrid_compare";
  const trayBreadth = clamp(products.length / 8, 0, 1);

  const comparisonFatigue = clamp(
    strategy.comparisonIntelligence * 0.35 +
      trayBreadth * 0.3 +
      (compareMode ? 0.25 : 0.08) +
      strategy.analytics.comparisonIntelligenceAnalytics * 0.01 * 0.1,
    0,
    1
  );

  let fatigueLane: ComparisonFatigue["fatigueLane"] = "fresh";
  if (comparisonFatigue >= 0.55) fatigueLane = "fatigued";
  else if (comparisonFatigue >= 0.35) fatigueLane = "moderate";

  return {
    comparisonFatigue: Math.round(comparisonFatigue * 1000) / 1000,
    fatigueLane,
  };
}

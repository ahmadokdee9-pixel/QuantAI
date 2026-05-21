/**
 * P5.7 — Strategic comparison evaluation (deterministic).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type StrategicComparison = {
  comparisonIntelligence: number;
  compareModeActive: boolean;
  topCompareSpread: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateStrategicComparison(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
  decision: DecisionIntelligenceMeta;
}): StrategicComparison {
  const { products, canonicalQuery, decision } = args;
  const compareModeActive =
    canonicalQuery.intent.primary === "market_compare" ||
    canonicalQuery.marketMode === "hybrid_compare" ||
    decision.routingLane === "compare";

  const top = products.slice(0, 3);
  const prices = top.map((p) => p.price).filter((p) => Number.isFinite(p));
  const topCompareSpread =
    prices.length >= 2 ? clamp((Math.max(...prices) - Math.min(...prices)) / Math.max(...prices), 0, 1) : 0;

  const comparisonIntelligence = clamp(
    decision.comparisonDecision * 0.4 +
      decision.analytics.comparisonIntelligenceAnalytics * 0.01 +
      (compareModeActive ? 0.35 : 0.15) +
      topCompareSpread * 0.2,
    0,
    1
  );

  return {
    comparisonIntelligence: Math.round(comparisonIntelligence * 1000) / 1000,
    compareModeActive,
    topCompareSpread: Math.round(topCompareSpread * 1000) / 1000,
  };
}

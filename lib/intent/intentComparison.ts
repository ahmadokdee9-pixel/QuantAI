/**
 * P6.1 — Recommendation vs comparison intent classification.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";

export type IntentComparison = {
  recommendationIntent: number;
  comparisonIntent: number;
  intentMode: "recommend" | "compare" | "mixed";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateIntentComparison(args: {
  canonicalQuery: CanonicalQueryContract;
  strategy: StrategyIntelligenceMeta;
}): IntentComparison {
  const { canonicalQuery, strategy } = args;

  const compareMode =
    canonicalQuery.intent.primary === "market_compare" || canonicalQuery.marketMode === "hybrid_compare";

  const comparisonIntent = clamp(
    (compareMode ? 0.55 : 0.15) + strategy.comparisonIntelligence * 0.35 + strategy.analytics.comparisonIntelligenceAnalytics * 0.01 * 0.1,
    0,
    1
  );
  const recommendationIntent = clamp(
    (compareMode ? 0.2 : 0.5) +
      strategy.recommendationHierarchy * 0.3 +
      strategy.analytics.recommendationAnalytics * 0.01 * 0.1,
    0,
    1
  );

  let intentMode: IntentComparison["intentMode"] = "mixed";
  if (comparisonIntent - recommendationIntent > 0.2) intentMode = "compare";
  else if (recommendationIntent - comparisonIntent > 0.2) intentMode = "recommend";

  return {
    recommendationIntent: Math.round(recommendationIntent * 1000) / 1000,
    comparisonIntent: Math.round(comparisonIntent * 1000) / 1000,
    intentMode,
  };
}

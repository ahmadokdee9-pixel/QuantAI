/**
 * P5.8 — Category lifecycle intelligence (deterministic).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";

export type MarketLifecycle = {
  marketLifecycle: number;
  lifecycleStage: "emerging" | "mature" | "saturated" | "unknown";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateMarketLifecycle(args: {
  canonicalQuery: CanonicalQueryContract;
  strategy: StrategyIntelligenceMeta;
}): MarketLifecycle {
  const { canonicalQuery, strategy } = args;

  let lifecycleStage: MarketLifecycle["lifecycleStage"] = "unknown";
  if (canonicalQuery.category === "unknown") lifecycleStage = "unknown";
  else if (strategy.categoryDominance >= 0.6) lifecycleStage = "mature";
  else if (strategy.analytics.categoryDominanceAnalytics >= 60) lifecycleStage = "saturated";
  else lifecycleStage = "emerging";

  const stageScore =
    lifecycleStage === "mature" ? 0.75 : lifecycleStage === "emerging" ? 0.55 : lifecycleStage === "saturated" ? 0.65 : 0.4;

  const marketLifecycle = clamp(stageScore * 0.6 + strategy.categoryDominance * 0.4, 0, 1);

  return {
    marketLifecycle: Math.round(marketLifecycle * 1000) / 1000,
    lifecycleStage,
  };
}

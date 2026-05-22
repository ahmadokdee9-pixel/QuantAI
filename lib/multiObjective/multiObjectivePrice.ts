/**
 * P6.2 — Price objective signal.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";

export type PriceObjective = {
  priceObjective: number;
  priceSensitivity: "low" | "moderate" | "high";
};

const BUDGET_LEX = /\b(cheap|budget|affordable|under|below|lowest|best price|deal|discount)\b/i;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluatePriceObjective(args: {
  canonicalQuery: CanonicalQueryContract;
  decision: DecisionIntelligenceMeta;
  market: MarketIntelligenceMeta;
}): PriceObjective {
  const { canonicalQuery, decision, market } = args;
  let priceObjective = clamp(
    (decision.budgetDecision ?? 0) * 0.35 +
      (market.analytics?.pricingAnalytics ?? 0) * 0.01 * 0.3 +
      (market.marketTrust ?? 0) * 0.2 +
      (1 - (decision.premiumDecision ?? 0)) * 0.15,
    0,
    1
  );
  if (BUDGET_LEX.test(canonicalQuery.originalQuery)) priceObjective += 0.15;
  if (canonicalQuery.intent.primary === "cheapest_trusted" || canonicalQuery.intent.primary === "best_value") {
    priceObjective += 0.1;
  }
  priceObjective = clamp(priceObjective, 0, 1);

  let priceSensitivity: PriceObjective["priceSensitivity"] = "moderate";
  if (priceObjective >= 0.55) priceSensitivity = "high";
  else if (priceObjective < 0.25) priceSensitivity = "low";

  return {
    priceObjective: Math.round(priceObjective * 1000) / 1000,
    priceSensitivity,
  };
}

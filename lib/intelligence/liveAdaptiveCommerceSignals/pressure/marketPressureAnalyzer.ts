/**
 * Phase 12 — Category trend pressure analyzer.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";
import { analyzeTrendPressure } from "@/lib/intelligence/autonomousCommerce/market/trendPressureAnalyzer";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function analyzeCategoryTrendPressure(args: {
  products: QuantProduct[];
  commerceOs?: AutonomousCommerceOsResult | null;
}): { pressure01: number; dominantCategory: string } {
  const market = args.commerceOs?.market ?? {
    seasonalDemand01: 0.25,
    pricingPressure01: 0.2,
    inventoryScarcity01: 0.15,
    merchantVolatility01: 0.2,
    discountAnomaly01: 0.1,
    categoryMomentum01: 0.25,
    launchCycle01: 0.2,
    marketSaturation01: 0.3,
  };
  const trend = analyzeTrendPressure(market);
  const categories = args.products.map((p) => p.qiCategory ?? "general");
  const counts = new Map<string, number>();
  for (const c of categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return {
    pressure01: round4(trend.pressureScore),
    dominantCategory: sorted[0]?.[0] ?? "general",
  };
}

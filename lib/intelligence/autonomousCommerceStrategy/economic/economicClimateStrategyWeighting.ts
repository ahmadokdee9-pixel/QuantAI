/**
 * Phase 15 — Economic climate strategy weighting.
 */

import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";
import { analyzePricingClimate } from "@/lib/intelligence/autonomousCommerce/economic/pricingClimateAnalyzer";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function weightEconomicClimateStrategy(commerceOs?: AutonomousCommerceOsResult | null): {
  climate: string;
  weight01: number;
} {
  const market = commerceOs?.market;
  const economic = commerceOs?.economic;
  if (!market || !economic) return { climate: "neutral", weight01: 0.25 };
  const climate = analyzePricingClimate(market, economic);
  return { climate: climate.climate, weight01: round4(Math.min(1, Math.abs(climate.score) + 0.25)) };
}

/**
 * Phase 12 — Pricing climate evolution (shadow).
 */

import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";
import { analyzePricingClimate } from "@/lib/intelligence/autonomousCommerce/economic/pricingClimateAnalyzer";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function evolvePricingClimate(commerceOs?: AutonomousCommerceOsResult | null): {
  climate: string;
  evolution01: number;
} {
  const market = commerceOs?.market ?? {
    seasonalDemand01: 0.25,
    pricingPressure01: 0.2,
    inventoryScarcity01: 0.15,
    merchantVolatility01: 0.2,
    discountAnomaly01: 0.1,
    categoryMomentum01: 0.25,
    launchCycle01: 0.2,
    marketSaturation01: 0.3,
  };
  const economic = commerceOs?.economic ?? {
    inflationSensitive01: 0.2,
    premiumCompression01: 0.2,
    valueMigration01: 0.2,
    regionalPattern01: 0.25,
    pricingInstability01: 0.2,
    seasonalAffordability01: 0.25,
  };
  const climate = analyzePricingClimate(market, economic);
  const evolution01 = round4(
    climate.score * 0.6 + (economic.pricingInstability01 ?? 0.2) * 0.4
  );
  return { climate: climate.climate, evolution01 };
}

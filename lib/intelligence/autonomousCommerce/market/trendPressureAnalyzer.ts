/**
 * Phase 8 — Trend pressure analyzer.
 */

import type { MarketConditionProfile } from "../types";

export type TrendPressureSnapshot = {
  pressureScore: number;
  momentumScore: number;
  dominantPressure: string;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function analyzeTrendPressure(market: MarketConditionProfile): TrendPressureSnapshot {
  const pressures: [string, number][] = [
    ["pricing", market.pricingPressure01],
    ["scarcity", market.inventoryScarcity01],
    ["discount_anomaly", market.discountAnomaly01],
    ["saturation", market.marketSaturation01],
  ];
  pressures.sort((a, b) => b[1] - a[1]);
  const pressureScore = round4(
    (market.pricingPressure01 + market.discountAnomaly01 + market.inventoryScarcity01) / 3
  );
  const momentumScore = round4(
    (market.categoryMomentum01 + market.launchCycle01 + market.seasonalDemand01) / 3
  );
  return {
    pressureScore,
    momentumScore,
    dominantPressure: pressures[0]?.[0] ?? "neutral",
  };
}

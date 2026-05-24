/**
 * Phase 8 — Pricing climate analyzer.
 */

import type { EconomicContextProfile } from "../types";
import type { MarketConditionProfile } from "../types";

export type PricingClimate = {
  climate: "tight" | "neutral" | "promotional";
  score: number;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function analyzePricingClimate(
  market: MarketConditionProfile,
  economic: EconomicContextProfile
): PricingClimate {
  const promo = market.discountAnomaly01 * 0.4 + market.pricingPressure01 * 0.35;
  const tight = economic.inflationSensitive01 * 0.4 + economic.premiumCompression01 * 0.35;
  const score = round4(promo - tight);
  const climate: PricingClimate["climate"] =
    score > 0.2 ? "promotional" : score < -0.15 ? "tight" : "neutral";
  return { climate, score };
}

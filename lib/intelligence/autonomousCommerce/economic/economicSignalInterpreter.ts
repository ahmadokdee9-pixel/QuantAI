/**
 * Phase 8 — Economic signal interpreter.
 */

import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { MarketConditionProfile } from "../types";
import type { EconomicContextProfile } from "../types";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function interpretEconomicSignals(args: {
  query: string;
  market: MarketConditionProfile;
  memoryResult?: CommerceMemoryResult | null;
  regionHint?: string;
}): EconomicContextProfile {
  const q = args.query.toLowerCase();
  const priceSens = args.memoryResult?.canonicalTaste.pricingBehavior.priceSensitivity01 ?? 0.4;
  const premium = args.memoryResult?.canonicalTaste.premiumIntent.premiumPreference01 ?? 0.3;

  let inflationSensitive01 = priceSens;
  if (/\b(inflation|cost of living|expensive|price hike)\b/.test(q)) inflationSensitive01 += 0.35;

  const premiumCompression01 = round4(
    clamp01(args.market.pricingPressure01 * 0.5 + (1 - premium) * 0.3)
  );
  const valueMigration01 = round4(clamp01(priceSens * 0.6 + args.market.discountAnomaly01 * 0.3));
  const regionalPattern01 = round4(
    /\b(eu|europe|nl|netherlands|uk|us|usa)\b/.test(q) || args.regionHint ? 0.55 : 0.25
  );
  const pricingInstability01 = round4(
    clamp01(args.market.merchantVolatility01 * 0.4 + args.market.pricingPressure01 * 0.4)
  );
  const seasonalAffordability01 = round4(
    clamp01((1 - args.market.seasonalDemand01) * 0.4 + (1 - premiumCompression01) * 0.3 + 0.2)
  );

  return {
    inflationSensitive01: round4(clamp01(inflationSensitive01)),
    premiumCompression01,
    valueMigration01,
    pricingInstability01,
    regionalPattern01,
    seasonalAffordability01,
  };
}

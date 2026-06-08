/**
 * Phase 42 — Value Intelligence Engine.
 */

import type { CategoryIntelligenceCore } from "@/lib/intelligence/categoryIntelligenceCoreEngine";
import type { RealDiscountProof } from "@/lib/intelligence/realDiscountProofEngine";
import type { RealMerchantVerification } from "@/lib/intelligence/realMerchantVerificationEngine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";

export type ValueBand =
  | "Exceptional Value"
  | "Strong Value"
  | "Good Value"
  | "Fair Value"
  | "Weak Value";

export type ValueIntelligenceCore = {
  version: 1;
  valueScore: number;
  band: ValueBand;
  performanceComponent: number;
  featuresComponent: number;
  reliabilityComponent: number;
  marketPriceComponent: number;
  competitionComponent: number;
  displayLine: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function bandForScore(score: number): ValueBand {
  if (score >= 90) return "Exceptional Value";
  if (score >= 80) return "Strong Value";
  if (score >= 70) return "Good Value";
  if (score >= 60) return "Fair Value";
  return "Weak Value";
}

/** Combined value score — never price alone. */
export function computeValueIntelligenceCore(args: {
  categoryIntel: CategoryIntelligenceCore;
  merchant: RealMerchantVerification;
  discountProof: RealDiscountProof;
  globalPrice: GlobalPriceIntelligence;
  qualityScore: number;
}): ValueIntelligenceCore {
  const { categoryIntel, merchant, discountProof, globalPrice, qualityScore } = args;

  const performanceComponent = clamp(Math.round(categoryIntel.categoryIntelligenceScore * 0.22), 0, 22);
  const featuresComponent = clamp(Math.round(qualityScore * 0.18), 0, 18);
  const reliabilityComponent = clamp(Math.round(merchant.merchantTrustScore * 0.15), 0, 15);
  const marketPriceComponent = clamp(Math.round(Math.max(0, globalPrice.priceAdvantagePct) * 0.35 + globalPrice.priceFairnessScore * 0.1), 0, 25);
  const competitionComponent = clamp(Math.round(discountProof.marketMedianDifferencePct * 0.2), 0, 20);

  const valueScore = clamp(
    Math.round(
      performanceComponent * 2.2 +
        featuresComponent * 2.5 +
        reliabilityComponent * 2.8 +
        marketPriceComponent * 2 +
        competitionComponent * 1.5
    ),
    0,
    100
  );

  const band = bandForScore(valueScore);

  return {
    version: 1,
    valueScore,
    band,
    performanceComponent,
    featuresComponent,
    reliabilityComponent,
    marketPriceComponent,
    competitionComponent,
    displayLine: `Value Score ${valueScore}/100 — ${band}`,
  };
}

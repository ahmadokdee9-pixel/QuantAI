/**
 * Phase 41 — Category-Balanced Ranking Engine.
 * Cheap must not beat strong value when quality/trust/condition are weak.
 */

import type { GlobalCategoryIntelligence } from "@/lib/intelligence/globalCategoryIntelligenceEngine";
import type { MerchantTrustSignal } from "@/lib/intelligence/merchantTrustEngineV2";

export type CategoryBalancedScore = {
  version: 1;
  balancedScore: number;
  priceComponent: number;
  qualityComponent: number;
  trustComponent: number;
  categoryFitComponent: number;
  cheapPenalty: number;
  premiumBoost: number;
};

/** Balance ranking — cheap weak listings do not dominate. */
export function computeCategoryBalancedScore(args: {
  price: number;
  medianPrice: number;
  qualityScore: number;
  merchantTrust: MerchantTrustSignal;
  categoryIntel: GlobalCategoryIntelligence;
  conditionBlob: string;
}): CategoryBalancedScore {
  const { price, medianPrice, qualityScore, merchantTrust, categoryIntel, conditionBlob } = args;

  const priceAdvantagePct = medianPrice > 0 ? ((medianPrice - price) / medianPrice) * 100 : 0;
  const priceComponent = Math.max(0, Math.min(28, Math.round(priceAdvantagePct * 0.35)));

  const qualityComponent = Math.round(qualityScore * 0.22);
  const trustComponent = Math.round(merchantTrust.trustScore * 0.18);
  const categoryFitComponent = Math.round(categoryIntel.categoryFitScore * 0.2);

  let cheapPenalty = 0;
  if (price < medianPrice * 0.75 && qualityScore < 55) cheapPenalty += 12;
  if (price < medianPrice * 0.7 && merchantTrust.trustScore < 50) cheapPenalty += 15;
  if (/used|refurb|renewed|damaged/i.test(conditionBlob) && merchantTrust.trustScore < 60) cheapPenalty += 8;

  let premiumBoost = 0;
  if (price >= medianPrice * 1.05 && qualityScore >= 72 && merchantTrust.trustScore >= 65) premiumBoost += 10;
  if (categoryIntel.categoryFitScore >= 78 && qualityScore >= 70) premiumBoost += 6;

  const balancedScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        priceComponent + qualityComponent + trustComponent + categoryFitComponent + premiumBoost - cheapPenalty
      )
    )
  );

  return {
    version: 1,
    balancedScore,
    priceComponent,
    qualityComponent,
    trustComponent,
    categoryFitComponent,
    cheapPenalty,
    premiumBoost,
  };
}

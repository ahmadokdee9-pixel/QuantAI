/**
 * Phase 41 — Insufficient Data Handling.
 * Never invent — never over-rank on weak data.
 */

import type { PrimaryVerdict } from "@/lib/ui/decisionLanguage";
import type { QuantProduct } from "@/lib/shoppingScore";

export type DataQualityAssessment = {
  version: 1;
  dataStrength: "strong" | "adequate" | "weak";
  useInsufficientData: boolean;
  recommendedVerdict: PrimaryVerdict;
  reasoning: string;
};

/** Assess whether listing has enough data for confident intelligence. */
export function assessDataQuality(args: {
  product: QuantProduct;
  hasPriceIntel: boolean;
  hasTrustIntel: boolean;
  hasCategoryIntel: boolean;
  imageConfidence: number;
}): DataQualityAssessment {
  const { product, hasPriceIntel, hasTrustIntel, hasCategoryIntel, imageConfidence } = args;

  const hasTitle = Boolean(product.title?.trim());
  const hasPrice = product.price > 0;
  const hasStore = Boolean(product.store?.trim());
  const hasReviews = (product.reviewsCount ?? 0) > 0 || (product.rating as number) > 0;

  let score = 0;
  if (hasTitle) score += 20;
  if (hasPrice) score += 25;
  if (hasStore) score += 15;
  if (hasReviews) score += 10;
  if (hasPriceIntel) score += 12;
  if (hasTrustIntel) score += 10;
  if (hasCategoryIntel) score += 8;
  if (imageConfidence >= 40) score += 5;

  const dataStrength: DataQualityAssessment["dataStrength"] =
    score >= 75 ? "strong" : score >= 50 ? "adequate" : "weak";

  const useInsufficientData = score < 35 && (!hasPrice || !hasStore);
  let recommendedVerdict: PrimaryVerdict = "COMPARE";
  if (useInsufficientData) recommendedVerdict = "INSUFFICIENT DATA";
  else if (dataStrength === "strong") recommendedVerdict = "BUY READY";
  else if (dataStrength === "weak") recommendedVerdict = "COMPARE";

  return {
    version: 1,
    dataStrength,
    useInsufficientData,
    recommendedVerdict,
    reasoning: useInsufficientData
      ? "Insufficient verified listing data — compare alternatives with clearer price and seller details."
      : dataStrength === "weak"
        ? "Limited data — compare before checkout; intelligence stays conservative."
        : "Adequate product data for category-aware purchase intelligence.",
  };
}

export function shouldAvoidOverRanking(data: DataQualityAssessment): boolean {
  return data.dataStrength === "weak" || data.useInsufficientData;
}

/**
 * Phase 45 — Merchant Reliability Engine.
 * Evidence-based merchant reliability beyond basic trust score.
 */

import type { RealMerchantVerification } from "@/lib/intelligence/realMerchantVerificationEngine";
import type { QuantProduct } from "@/lib/shoppingScore";

export type MerchantReliabilityLabel =
  | "Standard Seller Signal"
  | "Seller Trust Signal"
  | "Strong Seller Trust Signal"
  | "High Trust Signal Seller";

export type MerchantReliabilityIntelligence = {
  version: 1;
  merchantReliabilityScore: number;
  label: MerchantReliabilityLabel;
  merchantAgeSignal: number;
  reputationSignal: number;
  consistencySignal: number;
  pricingBehaviorSignal: number;
  fakePromotionRisk: number;
  fulfillmentQualitySignal: number;
  reasoning: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function labelForScore(score: number): MerchantReliabilityLabel {
  if (score >= 92) return "High Trust Signal Seller";
  if (score >= 82) return "Strong Seller Trust Signal";
  if (score >= 70) return "Seller Trust Signal";
  return "Standard Seller Signal";
}

/** Compute merchant reliability from evidence signals only. */
export function computeMerchantReliability(args: {
  product: QuantProduct;
  merchant?: RealMerchantVerification;
  merchantTrustScore?: number;
}): MerchantReliabilityIntelligence {
  const { product, merchant, merchantTrustScore = merchant?.merchantTrustScore ?? 65 } = args;
  const blob = `${product.store} ${product.title}`.toLowerCase();

  const marketplaceVerified = merchant?.marketplaceVerified ?? /amazon|apple|ikea|coolblue|bol|mediamarkt|best buy|official/i.test(blob);
  const merchantAgeSignal = marketplaceVerified
    ? 88
    : /refurb|outlet|unknown|no.?name/i.test(blob)
      ? 48
      : 68;

  const reviewCount = product.reviewsCount ?? 0;
  const reputationSignal = clamp(
    Math.round(
      (merchant?.reviewReliability ?? merchantTrustScore) * 0.5 +
        (merchant?.transparency ?? 70) * 0.3 +
        (reviewCount > 100 ? 12 : reviewCount > 20 ? 6 : 0)
    ),
    0,
    100
  );

  const consistencySignal = clamp(
    Math.round(
      ((merchant?.deliveryReliability ?? 70) + (merchant?.returnPolicy ?? 70) + (merchant?.priceStability ?? 70)) / 3
    ),
    0,
    100
  );

  let pricingBehaviorSignal = clamp(Math.round((merchant?.priceStability ?? 70) * 0.8 + (marketplaceVerified ? 10 : 0)), 0, 100);
  if (product.oldPrice && product.oldPrice > product.price * 2) pricingBehaviorSignal -= 18;

  const fakePromotionRisk = clamp(
    product.oldPrice && product.oldPrice > product.price * 1.9 ? 72 : product.oldPrice && product.oldPrice > product.price * 1.4 ? 38 : 12,
    0,
    100
  );

  const fulfillmentQualitySignal = clamp(
    Math.round(
      ((merchant?.deliveryReliability ?? 70) + (merchant?.warrantyQuality ?? 65) + reputationSignal) / 3 -
        fakePromotionRisk * 0.12
    ),
    0,
    100
  );

  const merchantReliabilityScore = clamp(
    Math.round(
      merchantAgeSignal * 0.15 +
        reputationSignal * 0.22 +
        consistencySignal * 0.18 +
        pricingBehaviorSignal * 0.15 +
        fulfillmentQualitySignal * 0.2 +
        merchantTrustScore * 0.1 -
        fakePromotionRisk * 0.15 +
        (marketplaceVerified ? 6 : 0)
    ),
    0,
    100
  );

  const label = labelForScore(merchantReliabilityScore);

  return {
    version: 1,
    merchantReliabilityScore,
    label,
    merchantAgeSignal,
    reputationSignal,
    consistencySignal,
    pricingBehaviorSignal,
    fakePromotionRisk,
    fulfillmentQualitySignal,
    reasoning: `${label} — reliability ${merchantReliabilityScore}/100 from age, reputation, fulfillment, and pricing behavior.`,
  };
}

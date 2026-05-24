/**
 * Phase 5 — Trust explainability layer (shadow meta).
 */

import type { MerchantTrustProfile, PriceTruthProfile, TrustExplainability } from "../types";
import type { MerchantOfferLink } from "@/lib/intelligence/identity/types";

export function buildTrustExplainability(args: {
  offer: MerchantOfferLink;
  merchant: MerchantTrustProfile | undefined;
  priceTruth: PriceTruthProfile | undefined;
  trusted: boolean;
}): TrustExplainability {
  const whyTrusted: string[] = [];
  const whySuspicious: string[] = [];
  const fakeDiscountReasons: string[] = [];
  const merchantConsistencyReasons: string[] = [];
  const pricingConfidenceReasons: string[] = [];

  if (args.trusted) {
    if (args.offer.trustScore >= 72) whyTrusted.push("high_retail_trust_score");
    if ((args.merchant?.consistencyScore ?? 0) >= 0.75) whyTrusted.push("consistent_merchant_catalog");
    if ((args.priceTruth?.priceTruthScore ?? 0) >= 70) whyTrusted.push("stable_price_truth");
    if (args.offer.warehouseConfidence >= 0.7) whyTrusted.push("reliable_fulfillment_signal");
  } else {
    if (args.merchant?.alert) whySuspicious.push("merchant_fraud_alert");
    if ((args.priceTruth?.fakeDiscountRisk01 ?? 0) >= 0.45) whySuspicious.push("elevated_fake_discount_risk");
    if (args.offer.duplicateSellerRisk >= 0.35) whySuspicious.push("duplicate_seller_pattern");
    if ((args.merchant?.fakeInventoryRisk01 ?? 0) >= 0.4) whySuspicious.push("fake_inventory_signals");
  }

  if (args.priceTruth) {
    fakeDiscountReasons.push(...args.priceTruth.reasons.filter((r) => r.includes("discount") || r.includes("msrp")));
    pricingConfidenceReasons.push(
      `historical_confidence_${Math.round(args.priceTruth.historicalConfidence01 * 100)}`,
      `price_truth_score_${args.priceTruth.priceTruthScore}`
    );
  }

  if (args.merchant) {
    merchantConsistencyReasons.push(...args.merchant.reasons);
  }

  return {
    whyTrusted,
    whySuspicious,
    fakeDiscountReasons,
    merchantConsistencyReasons,
    pricingConfidenceReasons,
  };
}

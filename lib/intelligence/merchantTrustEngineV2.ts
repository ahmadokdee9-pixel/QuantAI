/**
 * Phase 41 — Merchant Trust Engine V2.
 * Extended seller scoring — cheap + weak seller must not win.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import {
  buildMerchantTrustIntelligence,
  type MerchantTrustIntelligence,
} from "@/lib/intelligence/merchantTrustIntelligenceEngine";

export type MerchantTrustV2 = Omit<MerchantTrustIntelligence, "version"> & {
  version: 2;
  warrantyScore: number;
  deliveryTransparencyScore: number;
  priceHonestyScore: number;
  reviewQualityScore: number;
  conditionClarityScore: number;
  scamRiskScore: number;
  compositeCheckoutScore: number;
  v2Reasoning: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Extend merchant trust with billion-dollar checkout signals. */
export function buildMerchantTrustV2(product: QuantProduct): MerchantTrustV2 {
  const base = buildMerchantTrustIntelligence(product);
  const blob = `${product.store} ${product.title} ${product.availability ?? ""} ${product.shipping ?? ""}`.toLowerCase();

  let warrantyScore = 58;
  if (/apple|samsung|dyson|official|manufacturer/i.test(blob)) warrantyScore = 86;
  else if (/refurb|renewed|certified/i.test(blob)) warrantyScore = 68;
  else if (/unknown|generic|no warranty/i.test(blob)) warrantyScore = 38;

  let deliveryTransparencyScore = base.shippingQualityScore;
  if (/delivery in \d|ships within|estimated delivery|tracking/i.test(blob)) deliveryTransparencyScore += 8;

  let priceHonestyScore = 72;
  if (/too good to be true|flash sale|limited time only|90% off/i.test(blob)) priceHonestyScore = 35;
  else if (product.oldPrice != null && product.oldPrice > product.price * 2.5) priceHonestyScore = 42;

  const reviewQualityScore = clamp(
    Math.round(((product.rating as number) || 4) * 15 + Math.min(15, (product.reviewsCount ?? 0) / 25)),
    0,
    100
  );

  let conditionClarityScore = 70;
  if (/refurb|renewed|open box|used|grade [abc]/i.test(blob)) {
    conditionClarityScore = /certified|grade a|like new/i.test(blob) ? 74 : 48;
  }

  let scamRiskScore = 18;
  if (/unknown seller|dropship|unverified|no returns/i.test(blob)) scamRiskScore += 35;
  if (priceHonestyScore < 45) scamRiskScore += 20;
  if (base.reputationTier === "risky") scamRiskScore += 25;
  scamRiskScore = clamp(scamRiskScore, 0, 100);

  const compositeCheckoutScore = clamp(
    Math.round(
      base.trustScore * 0.28 +
        warrantyScore * 0.12 +
        deliveryTransparencyScore * 0.12 +
        priceHonestyScore * 0.14 +
        reviewQualityScore * 0.12 +
        conditionClarityScore * 0.1 +
        (100 - scamRiskScore) * 0.12
    ),
    0,
    100
  );

  const v2Reasoning =
    scamRiskScore >= 55
      ? `${product.store} carries elevated scam/fake listing risk — prefer trusted retailer alternatives.`
      : compositeCheckoutScore >= 78
        ? `${product.store} scores well on warranty, delivery transparency, and price honesty.`
        : `${product.store} acceptable seller — verify returns, warranty, and condition clarity before checkout.`;

  return {
    ...base,
    version: 2,
    trustScore: clamp(Math.round(base.trustScore * 0.6 + compositeCheckoutScore * 0.4), 0, 100),
    warrantyScore,
    deliveryTransparencyScore,
    priceHonestyScore,
    reviewQualityScore,
    conditionClarityScore,
    scamRiskScore,
    compositeCheckoutScore,
    v2Reasoning,
  };
}

export function merchantTrustBlocksBuyReady(trust: MerchantTrustV2): boolean {
  return trust.scamRiskScore >= 58 || trust.trustScore < 42;
}

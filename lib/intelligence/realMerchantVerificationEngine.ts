/**
 * Phase 42 — Real Merchant Verification Engine.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { buildMerchantTrustV2, type MerchantTrustV2 } from "@/lib/intelligence/merchantTrustEngineV2";

export type MerchantTrustBand =
  | "Elite Merchant"
  | "Trusted Merchant"
  | "Acceptable Merchant"
  | "Risky Merchant";

export type RealMerchantVerification = {
  version: 1;
  merchantTrustScore: number;
  band: MerchantTrustBand;
  merchantAge: string;
  deliveryReliability: number;
  returnPolicy: number;
  warrantyQuality: number;
  priceStability: number;
  reviewReliability: number;
  transparency: number;
  marketplaceVerified: boolean;
  reasoning: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function bandForScore(score: number): MerchantTrustBand {
  if (score >= 95) return "Elite Merchant"; // internal; display via qualifyMerchantTrustBand
  if (score >= 85) return "Trusted Merchant";
  if (score >= 70) return "Acceptable Merchant";
  return "Risky Merchant";
}

/** Full merchant verification — trust affects ranking. */
export function verifyMerchant(args: {
  product: QuantProduct;
  baseTrust?: MerchantTrustV2;
}): RealMerchantVerification {
  const base = args.baseTrust ?? buildMerchantTrustV2(args.product);
  const blob = `${args.product.store} ${args.product.title}`.toLowerCase();

  const marketplaceVerified = /amazon|apple|coolblue|bol|mediamarkt|best buy|ikea|official/i.test(blob);
  const merchantAge = /refurb|renewed|outlet/i.test(blob)
    ? "Established channel"
    : marketplaceVerified
      ? "Recognized storefront signal"
      : "Standard retailer";

  const deliveryReliability = base.deliveryTransparencyScore;
  const returnPolicy = base.returnPolicyScore;
  const warrantyQuality = base.warrantyScore;
  const priceStability = base.priceHonestyScore;
  const reviewReliability = base.reviewQualityScore;
  const transparency = clamp(Math.round((deliveryReliability + returnPolicy) / 2), 0, 100);

  const merchantTrustScore = clamp(
    Math.round(
      base.compositeCheckoutScore * 0.35 +
        deliveryReliability * 0.12 +
        returnPolicy * 0.12 +
        warrantyQuality * 0.1 +
        priceStability * 0.12 +
        reviewReliability * 0.1 +
        (marketplaceVerified ? 8 : 0) -
        base.scamRiskScore * 0.15
    ),
    0,
    100
  );

  const band = bandForScore(merchantTrustScore);

  return {
    version: 1,
    merchantTrustScore,
    band,
    merchantAge,
    deliveryReliability,
    returnPolicy,
    warrantyQuality,
    priceStability,
    reviewReliability,
    transparency,
    marketplaceVerified,
    reasoning: `${args.product.store} — ${band} (${merchantTrustScore}/100). ${base.v2Reasoning}`,
  };
}

export function merchantTrustAffectsRanking(score: number): number {
  return clamp(Math.round(score * 0.22), 0, 22);
}

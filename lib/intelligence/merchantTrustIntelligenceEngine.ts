/**
 * Phase 38 — Merchant Trust Intelligence (independent of product score).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

export type MerchantTrustIntelligence = {
  version: 1;
  trustScore: number;
  reputationTier: "excellent" | "good" | "mixed" | "risky";
  returnPolicyScore: number;
  shippingQualityScore: number;
  marketReputationScore: number;
  sellerAgeSignal: string;
  trustReasoning: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Build merchant trust intelligence independent of product quality. */
export function buildMerchantTrustIntelligence(product: QuantProduct): MerchantTrustIntelligence {
  const baseTrust = getStoreTrustScore(product.store);
  const blob = `${product.store} ${product.title} ${product.availability ?? ""}`.toLowerCase();

  let returnPolicyScore = 62;
  if (/amazon|apple|best buy|coolblue|bol\.com|john lewis|costco/i.test(blob)) returnPolicyScore = 88;
  else if (/ebay|marketplace|unknown|generic shop/i.test(blob)) returnPolicyScore = 48;

  let shippingQualityScore = 58;
  if (/free delivery|free shipping|next day|express/i.test(blob)) shippingQualityScore = 82;
  else if (/ships from|long delivery|weeks/i.test(blob)) shippingQualityScore = 42;

  let marketReputationScore = baseTrust;
  if ((product.reviewsCount ?? 0) >= 100) marketReputationScore += 6;
  if ((product.rating as number) >= 4.5) marketReputationScore += 4;

  const sellerAgeSignal = /refurb|renewed|outlet|certified/i.test(blob)
    ? "Established refurb/outlet channel"
    : /apple store|samsung|nike|official/i.test(blob)
      ? "Official brand channel"
      : "Standard marketplace retailer";

  const trustScore = clamp(
    Math.round(baseTrust * 0.45 + returnPolicyScore * 0.2 + shippingQualityScore * 0.15 + marketReputationScore * 0.2),
    0,
    100
  );

  const reputationTier: MerchantTrustIntelligence["reputationTier"] =
    trustScore >= 82 ? "excellent" : trustScore >= 68 ? "good" : trustScore >= 50 ? "mixed" : "risky";

  const trustReasoning =
    reputationTier === "excellent"
      ? `${product.store} shows excellent merchant trust for checkout and post-purchase support.`
      : reputationTier === "good"
        ? `${product.store} is a good trusted seller — verify returns before buying.`
        : reputationTier === "mixed"
          ? `${product.store} has mixed trust signals — compare seller policies first.`
          : `${product.store} carries elevated seller risk — prefer a trusted alternative if available.`;

  return {
    version: 1,
    trustScore,
    reputationTier,
    returnPolicyScore,
    shippingQualityScore,
    marketReputationScore: clamp(Math.round(marketReputationScore), 0, 100),
    sellerAgeSignal,
    trustReasoning,
  };
}

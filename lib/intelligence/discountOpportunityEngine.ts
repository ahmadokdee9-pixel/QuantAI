/**
 * Phase 36 — Discount Opportunity Engine.
 * Detects discounts, price gaps, and cheaper same/equivalent options in tray.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { EquivalentMatchResult } from "@/lib/intelligence/equivalentProductMatchingEngine";

export type PriceOpportunityLabel =
  | "STRONG DISCOUNT"
  | "BETTER PRICE FOUND"
  | "FAIR PRICE"
  | "PRICEY BUT JUSTIFIED"
  | "OVERPRICED"
  | "HIDDEN VALUE";

export type DiscountOpportunityInsight = {
  version: 1;
  discountScore: number;
  priceAdvantageScore: number;
  sameProductCheaperElsewhere: boolean;
  equivalentCheaperElsewhere: boolean;
  bestKnownLowerPrice: number | null;
  discountReason: string;
  priceOpportunityLabel: PriceOpportunityLabel;
  visibleDiscountPct: number | null;
  cheaperMerchantHint: string | null;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function median(nums: number[]): number {
  const s = nums.filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function visibleDiscountPct(product: QuantProduct): number | null {
  if (product.oldPrice == null || product.oldPrice <= product.price || product.price <= 0) return null;
  return Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
}

/** Build discount opportunity insight for one product inside a tray. */
export function buildDiscountOpportunityInsight(args: {
  product: QuantProduct;
  tray: QuantProduct[];
  equivalent?: EquivalentMatchResult;
}): DiscountOpportunityInsight {
  const { product, tray, equivalent } = args;
  const prices = tray.map((p) => p.price).filter((n) => n > 0);
  const med = median(prices);
  const visible = visibleDiscountPct(product);
  const priceVsMedian = med > 0 && product.price > 0 ? (med - product.price) / med : 0;

  const sameMatches = equivalent?.sameProductMatches ?? [];
  const equivMatches = equivalent?.equivalentMatches ?? [];
  const cheaperSame = sameMatches.filter((m) => m.price < product.price * 0.98);
  const cheaperEquiv = equivMatches.filter((m) => m.price < product.price * 0.95);

  const sameProductCheaperElsewhere = cheaperSame.length > 0;
  const equivalentCheaperElsewhere = cheaperEquiv.length > 0;
  const bestKnownLowerPrice =
    [...cheaperSame, ...cheaperEquiv].sort((a, b) => a.price - b.price)[0]?.price ??
    (product.price > 0 ? Math.min(...prices.filter((p) => p < product.price), Number.POSITIVE_INFINITY) : null);

  const normalizedBest =
    bestKnownLowerPrice != null && Number.isFinite(bestKnownLowerPrice) ? bestKnownLowerPrice : null;

  let discountScore = 42;
  if (visible != null && visible >= 15) discountScore += 22;
  if (visible != null && visible >= 30) discountScore += 12;
  if (priceVsMedian > 0.08) discountScore += Math.round(priceVsMedian * 40);
  if (sameProductCheaperElsewhere) discountScore -= 18;
  if (equivalentCheaperElsewhere && !sameProductCheaperElsewhere) discountScore -= 8;
  if (product.qiCommerce?.priceAnomaly === "suspicious_low") discountScore -= 15;

  let priceAdvantageScore = clamp(Math.round(50 + priceVsMedian * 55), 0, 100);
  if (sameProductCheaperElsewhere) priceAdvantageScore = clamp(priceAdvantageScore - 24, 0, 100);
  if (visible != null && visible >= 20) priceAdvantageScore = clamp(priceAdvantageScore + 10, 0, 100);

  let priceOpportunityLabel: PriceOpportunityLabel = "FAIR PRICE";
  if (visible != null && visible >= 25) priceOpportunityLabel = "STRONG DISCOUNT";
  else if (sameProductCheaperElsewhere || equivalentCheaperElsewhere) priceOpportunityLabel = "BETTER PRICE FOUND";
  else if (priceVsMedian > 0.12 && visible != null) priceOpportunityLabel = "HIDDEN VALUE";
  else if (priceVsMedian < -0.12) priceOpportunityLabel = "OVERPRICED";
  else if (priceVsMedian < -0.05 && (product.rating as number) >= 4.5) priceOpportunityLabel = "PRICEY BUT JUSTIFIED";

  let discountReason = "Price sits near the tray market average.";
  if (priceOpportunityLabel === "STRONG DISCOUNT") {
    discountReason = visible != null ? `Visible ${visible}% discount against listed anchor price.` : "Strong markdown signals in this listing.";
  } else if (priceOpportunityLabel === "BETTER PRICE FOUND") {
    const hint = cheaperSame[0]?.store ?? cheaperEquiv[0]?.store ?? "another merchant";
    discountReason = `Same or equivalent item may be cheaper at ${hint} in this tray.`;
  } else if (priceOpportunityLabel === "HIDDEN VALUE") {
    discountReason = "Below tray average without an obvious markdown badge — potential hidden value.";
  } else if (priceOpportunityLabel === "OVERPRICED") {
    discountReason = "Priced above tray peers without compensating trust or spec advantage.";
  } else if (priceOpportunityLabel === "PRICEY BUT JUSTIFIED") {
    discountReason = "Premium pricing may be justified by ratings, brand tier, or spec lead.";
  }

  return {
    version: 1,
    discountScore: clamp(Math.round(discountScore), 0, 100),
    priceAdvantageScore,
    sameProductCheaperElsewhere,
    equivalentCheaperElsewhere,
    bestKnownLowerPrice: normalizedBest,
    discountReason,
    priceOpportunityLabel,
    visibleDiscountPct: visible,
    cheaperMerchantHint: cheaperSame[0]?.store ?? cheaperEquiv[0]?.store ?? null,
  };
}

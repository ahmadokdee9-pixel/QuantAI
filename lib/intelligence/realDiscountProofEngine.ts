/**
 * Phase 42 — Real Discount Proof Engine.
 * Never show REAL DISCOUNT unless verification passes.
 */

import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { RealDiscountValidationV3 } from "@/lib/intelligence/realDiscountValidationV3Engine";
import type { CommercePriceHistoryIntelligence } from "@/lib/intelligence/commercePriceHistoryEngine";
import type { QuantProduct } from "@/lib/shoppingScore";

export type DiscountAuthenticityBand =
  | "Fake Discount"
  | "Unverified Discount"
  | "Verified Discount"
  | "Exceptional Discount";

export type RealDiscountProof = {
  version: 1;
  discountAuthenticityScore: number;
  band: DiscountAuthenticityBand;
  verifiedSavingEur: number;
  discountAuthenticityLine: string;
  marketMedianDifferencePct: number;
  historicalPrice: number | null;
  categoryMedian: number;
  equivalentMedian: number;
  merchantHistoricalPrice: number | null;
  verified: boolean;
  displayLine: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function bandForScore(score: number): DiscountAuthenticityBand {
  if (score >= 85) return "Exceptional Discount";
  if (score >= 70) return "Verified Discount";
  if (score >= 40) return "Unverified Discount";
  return "Fake Discount";
}

/** Verify discount authenticity using price history, medians, and competition. */
export function proveRealDiscount(args: {
  product: QuantProduct;
  globalPrice: GlobalPriceIntelligence;
  realDiscountV3: RealDiscountValidationV3;
  priceHistory?: CommercePriceHistoryIntelligence;
  equivalentMedian?: number;
}): RealDiscountProof {
  const { product, globalPrice, realDiscountV3, priceHistory, equivalentMedian } = args;

  const categoryMedian = globalPrice.medianMarketPrice || product.price;
  const equivMedian = equivalentMedian ?? categoryMedian;
  const historicalPrice = priceHistory?.historicalHigh ?? product.oldPrice ?? null;
  const merchantHistorical = priceHistory?.averageMarketPrice ?? product.oldPrice ?? null;

  let score = realDiscountV3.realDiscountScore;
  if (globalPrice.priceAdvantagePct > 0) score += Math.min(12, globalPrice.priceAdvantagePct * 0.4);
  if (realDiscountV3.fakeDiscountScoreHigh) score -= 25;
  if (priceHistory?.label === "Historical Low" || priceHistory?.label === "Great Price") score += 10;
  score = clamp(Math.round(score), 0, 100);

  const band = bandForScore(score);
  const verified = score >= 70 && !realDiscountV3.fakeDiscountScoreHigh;

  const verifiedSavingEur = Math.max(
    0,
    Math.round(
      historicalPrice && historicalPrice > product.price
        ? historicalPrice - product.price
        : categoryMedian > product.price
          ? categoryMedian - product.price
          : 0
    )
  );

  const marketMedianDifferencePct = categoryMedian > 0
    ? Math.round(((categoryMedian - product.price) / categoryMedian) * 100)
    : 0;

  const discountAuthenticityLine = verified
    ? `Verified saving €${verifiedSavingEur} — ${band}.`
    : band === "Fake Discount"
      ? "Discount authenticity failed — marketing may be inflated."
      : `Unverified discount — ${band}. Compare before trusting markdown.`;

  return {
    version: 1,
    discountAuthenticityScore: score,
    band,
    verifiedSavingEur,
    discountAuthenticityLine,
    marketMedianDifferencePct,
    historicalPrice,
    categoryMedian,
    equivalentMedian: equivMedian,
    merchantHistoricalPrice: merchantHistorical,
    verified,
    displayLine: `Verified Saving: €${verifiedSavingEur} · Discount Authenticity: ${band} · Market Median Diff: ${marketMedianDifferencePct}%`,
  };
}

export function discountProofAllowsRealLabel(proof: RealDiscountProof): boolean {
  return proof.verified && proof.discountAuthenticityScore >= 70;
}

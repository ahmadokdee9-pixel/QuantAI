/**
 * Phase 39 — Real Discount Validation V3.
 */

import type { DiscountIntelligenceV2 } from "@/lib/intelligence/discountIntelligenceV2Engine";
import type { CommercePriceHistoryIntelligence } from "@/lib/intelligence/commercePriceHistoryEngine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { detectFakeDiscountSignals } from "@/lib/intelligence/fakeDiscountDetector";

export type RealDiscountValidationV3 = {
  version: 3;
  fakeDiscountScore: number;
  realDiscountScore: number;
  fakeDiscountScoreHigh: boolean;
  reasoning: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Validate discount reality using history, median, competitors, and trend. */
export function validateRealDiscountV3(args: {
  product: QuantProduct;
  tray: QuantProduct[];
  globalPrice: GlobalPriceIntelligence;
  discountV2: DiscountIntelligenceV2;
  priceHistory?: CommercePriceHistoryIntelligence;
}): RealDiscountValidationV3 {
  const { product, tray, globalPrice, discountV2, priceHistory } = args;
  const fakeSignals = detectFakeDiscountSignals(product, tray);

  let fakeDiscountScore = clamp(Math.round(fakeSignals.fakeDiscountProbability * 100), 0, 100);
  if (discountV2.inflatedDiscount) fakeDiscountScore += 12;
  if (globalPrice.priceAdvantagePct < 0 && discountV2.visibleDiscountPct != null) fakeDiscountScore += 15;
  fakeDiscountScore = clamp(fakeDiscountScore, 0, 100);

  let realDiscountScore = 40;
  if (globalPrice.priceAdvantagePct > 0) realDiscountScore += Math.min(25, globalPrice.priceAdvantagePct);
  if (discountV2.realDiscount) realDiscountScore += 18;
  if (priceHistory?.label === "Historical Low" || priceHistory?.label === "Great Price") realDiscountScore += 12;
  if (priceHistory?.insight.trend === "down") realDiscountScore += 8;
  realDiscountScore -= Math.round(fakeDiscountScore * 0.35);
  realDiscountScore = clamp(Math.round(realDiscountScore), 0, 100);

  const fakeDiscountScoreHigh = fakeDiscountScore >= 58;

  const reasoning = fakeDiscountScoreHigh
    ? "Discount marketing looks inflated versus search-sample median and peer listings."
    : realDiscountScore >= 60
      ? "Discount signal vs search-sample median and remembered price snapshots."
      : "Discount badge is secondary — value comes from fair pricing in this search sample.";

  return {
    version: 3,
    fakeDiscountScore,
    realDiscountScore,
    fakeDiscountScoreHigh,
    reasoning,
  };
}

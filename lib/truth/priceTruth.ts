/**
 * Phase 1D — Price truth bundle (history + reference + verification).
 */

import { buildPriceHistoryBaselines, computeBaselineCoverage } from "@/lib/truth/priceHistoryEngine";
import {
  buildDiscountEvidence,
  computePriceTruthConfidence,
  verifyDiscount,
} from "@/lib/truth/discountVerificationEngine";
import { detectFakeDiscount } from "@/lib/truth/fakeDiscountDetector";
import type {
  HistoricalPriceObservationRow,
  PriceTruthBundle,
} from "@/lib/truth/priceHistoryTypes";
import { buildReferencePriceSnapshot } from "@/lib/truth/referencePriceEngine";

/** Build full price truth bundle from canonical SKU observations (no UI/search wiring). */
export function buildPriceTruthBundle(args: {
  canonicalSkuId: string;
  currentPrice: number;
  currency?: string;
  observations: HistoricalPriceObservationRow[];
  marketedOldPrice?: number | null;
  now?: Date;
}): PriceTruthBundle {
  const baselines = buildPriceHistoryBaselines({
    canonicalSkuId: args.canonicalSkuId,
    currentPrice: args.currentPrice,
    currency: args.currency,
    observations: args.observations,
    now: args.now,
  });
  const baselineCoverage = computeBaselineCoverage(baselines);
  const referencePrices = buildReferencePriceSnapshot(baselines);
  const fakeDiscount = detectFakeDiscount({
    currentPrice: args.currentPrice,
    marketedOldPrice: args.marketedOldPrice,
    baselines,
    referencePrices,
    observations: args.observations,
    now: args.now,
  });
  const verification = verifyDiscount({
    currentPrice: args.currentPrice,
    baselines,
    referencePrices,
    baselineCoverage,
    fakeDiscount,
    marketedOldPrice: args.marketedOldPrice,
  });
  const discountEvidence = {
    ...buildDiscountEvidence(verification),
    sampleCount: baselineCoverage.samples90d,
  };
  const priceTruthConfidence = computePriceTruthConfidence({
    baselineCoverage,
    verification,
    fakeDiscount,
  });

  return {
    priceTruthConfidence,
    discountEvidence,
    baselineCoverage,
    baselines,
    referencePrices,
    verification,
    fakeDiscount,
  };
}

export {
  buildPriceHistoryBaselines,
  computeBaselineCoverage,
} from "@/lib/truth/priceHistoryEngine";
export { buildReferencePriceSnapshot } from "@/lib/truth/referencePriceEngine";
export {
  buildDiscountEvidence,
  computePriceTruthConfidence,
  verifyDiscount,
} from "@/lib/truth/discountVerificationEngine";
export { detectFakeDiscount } from "@/lib/truth/fakeDiscountDetector";
export type {
  BaselineCoverage,
  DiscountEvidence,
  DiscountVerificationResult,
  DiscountVerificationState,
  FakeDiscountAssessment,
  HistoricalPriceObservationInsert,
  HistoricalPriceObservationRow,
  PriceHistoryBaselines,
  PriceTruthBundle,
  ReferencePriceSnapshot,
} from "@/lib/truth/priceHistoryTypes";

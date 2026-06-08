/**
 * Phase 38 — Best Deal Found System (strict criteria).
 */

import type { DiscountIntelligenceV2 } from "@/lib/intelligence/discountIntelligenceV2Engine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { MerchantTrustIntelligence } from "@/lib/intelligence/merchantTrustIntelligenceEngine";

export type BestDealFoundAssessment = {
  version: 1;
  isBestDealFound: boolean;
  verifiedSavings: number;
  verifiedSavingsPct: number;
  reasoning: string;
};

const PRICE_ADVANTAGE_THRESHOLD = 8;
const TRUST_THRESHOLD = 62;
const DISCOUNT_TRUST_THRESHOLD = 55;

/** Strict BEST DEAL FOUND assessment — highest priority label. */
export function assessBestDealFound(args: {
  globalPrice: GlobalPriceIntelligence;
  discountV2: DiscountIntelligenceV2;
  merchantTrust: MerchantTrustIntelligence;
  isLowestInUniverse: boolean;
}): BestDealFoundAssessment {
  const { globalPrice, discountV2, merchantTrust, isLowestInUniverse } = args;

  const verifiedSavings = Math.max(0, globalPrice.medianMarketPrice - (globalPrice.lowestPriceFound ?? 0));
  const verifiedSavingsPct = globalPrice.priceAdvantagePct;

  const isBestDealFound =
    isLowestInUniverse &&
    globalPrice.priceAdvantagePct >= PRICE_ADVANTAGE_THRESHOLD &&
    merchantTrust.trustScore >= TRUST_THRESHOLD &&
    discountV2.discountTrust >= DISCOUNT_TRUST_THRESHOLD &&
    !discountV2.fakeDiscount &&
    globalPrice.priceOpportunityScore >= 60;

  const reasoning = isBestDealFound
    ? `Best deal found — verified ${verifiedSavingsPct}% below market median with trusted merchant and real savings.`
    : verifiedSavingsPct > 0
      ? `Good price opportunity but not best-deal certified — verify trust and discount authenticity.`
      : "No best-deal certification — price sits near market average.";

  return {
    version: 1,
    isBestDealFound,
    verifiedSavings,
    verifiedSavingsPct,
    reasoning,
  };
}

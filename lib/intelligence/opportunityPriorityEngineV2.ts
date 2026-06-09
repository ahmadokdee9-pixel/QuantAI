/**
 * Phase 39 — Opportunity Priority Engine V2.
 */

import type { DiscountIntelligenceV2 } from "@/lib/intelligence/discountIntelligenceV2Engine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { MerchantTrustSignal } from "@/lib/intelligence/merchantTrustEngineV2";
import type { RealDiscountValidationV3 } from "@/lib/intelligence/realDiscountValidationV3Engine";

export type OpportunityPriorityV2 = {
  version: 2;
  opportunityScore: number;
  priceAdvantageComponent: number;
  qualityAdvantageComponent: number;
  merchantTrustComponent: number;
  discountRealityComponent: number;
  marketPositionComponent: number;
  autoBuyReady: boolean;
  headline: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Compute v2 opportunity score — value can trigger BUY READY without huge discounts. */
export function computeOpportunityPriorityV2(args: {
  globalPrice: GlobalPriceIntelligence;
  merchantTrust: MerchantTrustSignal;
  discountV2: DiscountIntelligenceV2;
  realDiscount: RealDiscountValidationV3;
  qualityScore: number;
}): OpportunityPriorityV2 {
  const { globalPrice, merchantTrust, discountV2, realDiscount, qualityScore } = args;

  const priceAdvantageComponent = clamp(Math.round(Math.max(0, globalPrice.priceAdvantagePct) * 1.4), 0, 35);
  const qualityAdvantageComponent = clamp(Math.round((qualityScore - 50) * 0.35), 0, 25);
  const merchantTrustComponent = clamp(Math.round((merchantTrust.trustScore - 50) * 0.28), 0, 20);
  const discountRealityComponent = clamp(Math.round(realDiscount.realDiscountScore * 0.18), 0, 15);
  const marketPositionComponent = clamp(Math.round(globalPrice.priceOpportunityScore * 0.12), 0, 15);

  const opportunityScore = clamp(
    Math.round(
      priceAdvantageComponent +
        qualityAdvantageComponent +
        merchantTrustComponent +
        discountRealityComponent +
        marketPositionComponent
    ),
    0,
    100
  );

  const autoBuyReady =
    opportunityScore >= 62 &&
    merchantTrust.trustScore >= 58 &&
    qualityScore >= 55 &&
    globalPrice.priceAdvantagePct >= 3 &&
    !realDiscount.fakeDiscountScoreHigh;

  const headline = autoBuyReady
    ? `Strong purchase opportunity — €${globalPrice.medianMarketPrice > 0 ? globalPrice.medianMarketPrice : "market"} median vs current pricing with trusted seller.`
    : `Opportunity score ${opportunityScore} — ${globalPrice.priceLabel.toLowerCase()} market position.`;

  return {
    version: 2,
    opportunityScore,
    priceAdvantageComponent,
    qualityAdvantageComponent,
    merchantTrustComponent,
    discountRealityComponent,
    marketPositionComponent,
    autoBuyReady,
    headline,
  };
}

export const OPPORTUNITY_BUY_READY_THRESHOLD = 62;

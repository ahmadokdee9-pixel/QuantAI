import type { CopilotProductBrief } from "@/lib/copilot/sessionTypes";
import type { ProductDealIntelligence } from "@/lib/intelligence/dealIntelligenceEngine";
import { getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";

export function toCopilotProductBrief(
  p: QuantProduct,
  dealIntel?: ProductDealIntelligence | null
): CopilotProductBrief {
  return {
    id: p.id,
    title: p.title,
    store: p.store,
    price: p.price,
    link: p.link,
    rating: p.rating,
    reviewsCount: p.reviewsCount,
    qiComposite: p.qiComposite,
    qiVerdict: p.qiVerdict,
    buyingVerdict: p.qiCommerce?.buyingVerdict,
    valueForMoney: p.qiCommerce?.valueForMoney,
    storeTrust: getStoreTrustScore(p.store),
    commerceConfidence: p.qiCommerce?.confidence,
    priceAnomaly: p.qiCommerce?.priceAnomaly,
    risks: p.qiCommerce?.risks?.map((r) => ({ code: r.code, label: r.label })),
    aiDealVerdict: dealIntel?.aiDealVerdict,
    dealConfidence: dealIntel?.dealConfidence,
    discountAuthenticity: dealIntel?.discountAuthenticity,
    valueOpportunityScore: dealIntel?.valueOpportunity,
    retailerDealScore: dealIntel?.retailerAdjustedDealScore,
    dealTimingNote: dealIntel?.timingSummary,
  };
}

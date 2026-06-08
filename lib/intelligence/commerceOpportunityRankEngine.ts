/**
 * Phase 38 — Commerce Opportunity Rank Engine.
 * Ranks purchase opportunities, not products alone.
 */

import type { BestPlaceToBuy } from "@/lib/intelligence/bestPlaceToBuyEngine";
import type { DiscountIntelligenceV2 } from "@/lib/intelligence/discountIntelligenceV2Engine";
import type { GlobalBuyOpportunity } from "@/lib/intelligence/globalBuyOpportunityEngine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { MerchantTrustIntelligence } from "@/lib/intelligence/merchantTrustIntelligenceEngine";

export type OpportunityClass =
  | "Best Deal Found"
  | "Strong Discount"
  | "Underpriced Product"
  | "Best Value"
  | "Best Trusted Offer"
  | "Premium Opportunity";

export type RankedCommerceOpportunity = {
  version: 1;
  link: string;
  opportunityClass: OpportunityClass;
  opportunityScore: number;
  rank: number;
  headline: string;
};

function classifyOpportunity(args: {
  globalPrice: GlobalPriceIntelligence;
  discountV2: DiscountIntelligenceV2;
  buyOpportunity: GlobalBuyOpportunity;
  merchantTrust: MerchantTrustIntelligence;
  bestPlace: BestPlaceToBuy;
}): OpportunityClass {
  const { globalPrice, discountV2, buyOpportunity, merchantTrust, bestPlace } = args;

  if (
    bestPlace.isCurrentListing &&
    globalPrice.priceAdvantagePct >= 10 &&
    merchantTrust.trustScore >= 65 &&
    discountV2.discountTrust >= 60
  ) {
    return "Best Deal Found";
  }
  if (discountV2.discountLabel === "STRONG DISCOUNT" || discountV2.realDiscount) return "Strong Discount";
  if (globalPrice.priceLabel === "UNDERPRICED" || globalPrice.priceAdvantagePct >= 8) return "Underpriced Product";
  if (buyOpportunity.valueLedBuy) return "Best Value";
  if (merchantTrust.trustScore >= 78 && globalPrice.priceFairnessScore >= 55) return "Best Trusted Offer";
  return "Premium Opportunity";
}

/** Rank all tray opportunities by commerce priority. */
export function rankCommerceOpportunities(
  rows: Array<{
    link: string;
    globalPrice: GlobalPriceIntelligence;
    discountV2: DiscountIntelligenceV2;
    buyOpportunity: GlobalBuyOpportunity;
    merchantTrust: MerchantTrustIntelligence;
    bestPlace: BestPlaceToBuy;
  }>
): RankedCommerceOpportunity[] {
  const priority: Record<OpportunityClass, number> = {
    "Best Deal Found": 100,
    "Strong Discount": 85,
    "Underpriced Product": 78,
    "Best Value": 72,
    "Best Trusted Offer": 66,
    "Premium Opportunity": 58,
  };

  const scored = rows.map((row) => {
    const opportunityClass = classifyOpportunity(row);
    const opportunityScore = Math.round(
      priority[opportunityClass] * 0.55 +
        row.buyOpportunity.buyOpportunityScore * 0.25 +
        row.globalPrice.priceOpportunityScore * 0.12 +
        row.merchantTrust.trustScore * 0.08
    );
    return {
      version: 1 as const,
      link: row.link,
      opportunityClass,
      opportunityScore,
      rank: 0,
      headline: `${opportunityClass} at ${row.bestPlace.merchant} — €${row.bestPlace.price}`,
    };
  });

  scored.sort((a, b) => b.opportunityScore - a.opportunityScore);
  scored.forEach((row, index) => {
    row.rank = index + 1;
  });

  return scored;
}

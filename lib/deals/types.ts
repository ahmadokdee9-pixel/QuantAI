import type { QuantProduct } from "@/lib/shoppingScore";

export type DealVerdict =
  | "Real deal"
  | "Suspicious discount"
  | "Strong value"
  | "Overpriced"
  | "Wait for lower pricing"
  | "Compare carefully";

export type BuyVsWait = "buy_now" | "compare" | "wait";

export type FakeDiscountRisk = "low" | "medium" | "high";

export type DataCompleteness = "high" | "medium" | "low";

export type PrimaryDealAction = "buy_now" | "compare" | "wait";

export type MarketplaceSellerRisk = "low" | "medium" | "high";

export type ListingDealInsight = {
  link: string;
  dealVerdict: DealVerdict;
  dealQualityScore: number;
  buyerConfidence: number;
  reasoning: string;
  fakeDiscountRisk: FakeDiscountRisk;
  buyVsWait: BuyVsWait;
  discountPct: number | null;
  returnPolicyHint: string;
  stockUrgency: "none" | "low" | "elevated";
  savingsVsFair: number | null;
  tooGoodToBeTrue: boolean;
  dataGaps: string[];
  marketplaceSellerRisk: MarketplaceSellerRisk;
  ratingAuthenticityHint: string;
  /** Smarter timing headline from predictive commerce (optional). */
  predictiveTimingLabel?: string;
};

export type ClusterPicks = {
  bestOverall: string;
  bestBudget: string;
  mostTrusted: string;
  fastestDelivery: string;
  premiumChoice: string;
  bestLongTermValue: string;
  /** Lowest price with elevated risk (trust, reviews, or discount hygiene). */
  riskyButCheap: string;
  /** Example listing where patience or a different store likely wins. */
  waitForBetterPricing: string;
  /** Best return / warranty language + trust blend in-cluster. */
  bestWarrantySupport: string;
  /** Premium ticket with weak value signal (overpriced or soft quality vs price). */
  premiumOverpriced: string;
};

export type DealClusterDTO = {
  id: string;
  canonicalTitle: string;
  listings: QuantProduct[];
  fairMarketEstimate: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  priceSpreadPct: number;
  bestDiscountPct: number | null;
  volatilityNote: string;
  picks: ClusterPicks;
  listingInsights: ListingDealInsight[];
  advisorSummary: string;
  /** 0–100: how strongly QuantAI believes these rows are the same product. */
  clusterDealConfidence: number;
  suspiciousDiscountCluster: boolean;
  dataCompleteness: DataCompleteness;
  inferredCategoryLabel: string;
  retailTrustNote: string;
  groupingRationale: string;
  hiddenRisksNote: string;
  whenCheapestNotBest: string | null;
  primaryRecommendation: PrimaryDealAction;
  primaryRecommendationReason: string;
  uncertaintyNote: string;
  matchSignalsSummary: string;
  imageSimilarityNote: string;
};

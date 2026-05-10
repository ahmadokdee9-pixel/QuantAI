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

export type ListingDealInsight = {
  link: string;
  dealVerdict: DealVerdict;
  dealQualityScore: number;
  reasoning: string;
  fakeDiscountRisk: FakeDiscountRisk;
  buyVsWait: BuyVsWait;
  discountPct: number | null;
  returnPolicyHint: string;
  stockUrgency: "none" | "low" | "elevated";
  savingsVsFair: number | null;
};

export type ClusterPicks = {
  bestOverall: string;
  bestBudget: string;
  mostTrusted: string;
  fastestDelivery: string;
  premiumChoice: string;
  bestLongTermValue: string;
};

export type DealClusterDTO = {
  id: string;
  canonicalTitle: string;
  listings: QuantProduct[];
  fairMarketEstimate: number;
  priceSpreadPct: number;
  volatilityNote: string;
  picks: ClusterPicks;
  listingInsights: ListingDealInsight[];
  advisorSummary: string;
};

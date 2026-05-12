import type { QuantPlanTier } from "@/lib/subscription/plans";

/** Compact listing row sent to the copilot API (client-built from `QuantProduct`). */
export type CopilotProductBrief = {
  id: number;
  title: string;
  store: string;
  price: number;
  link: string;
  rating: number | string;
  reviewsCount: number | null;
  qiComposite?: number;
  qiVerdict?: string;
  buyingVerdict?: string;
  valueForMoney?: number;
  /** Store trust prior 0-100 for lightweight copilot chips (no extra client compute). */
  storeTrust?: number;
  commerceConfidence?: number;
  priceAnomaly?: "none" | "deep_discount" | "premium_outlier" | "suspicious_low";
  risks?: { code: string; label: string }[];
  /** Deal intelligence engine (tray-relative when batch-computed on home). */
  aiDealVerdict?: string;
  dealConfidence?: number;
  discountAuthenticity?: number;
  valueOpportunityScore?: number;
  retailerDealScore?: number;
  dealTimingNote?: string;
  /** @deprecated use primaryShelfLabel — kept for older copilot prompts */
  primaryDiscountLabel?: string;
  primaryShelfLabel?: string;
  hasDiscount?: boolean;
  discountPercent?: number | null;
  discountConfidence?: number;
  suspiciousDiscountRisk?: number;
  discountExplanation?: string;
  liveRankExplanation?: string;
  discountVsQualityNote?: string;
  retailerTrustNote?: string;
  retailerIntelligenceScore?: number;
  worthBuyingNow?: "yes" | "maybe" | "wait";
  trustAdjustedDiscountScore?: number;
};

export type CopilotSavedBrief = { title: string; link: string; price: number | null };
export type CopilotWatchBrief = { title: string; link?: string; price?: number | null };
export type CopilotCompareHistoryBrief = { at: string; summary: string };

export type CopilotSessionPayload = {
  route: "home" | "dashboard" | "pricing" | "saved" | "unknown";
  lastSearchQuery: string;
  products: CopilotProductBrief[];
  savedSummaries: CopilotSavedBrief[];
  watchlistSummaries: CopilotWatchBrief[];
  compareTrayLinks: string[];
  subscriptionTier: QuantPlanTier | string;
  entitlementsLevel?: string;
  memoryHints: string[];
  searchIntelligenceExcerpt: { finalHeadline?: string; finalBody?: string } | null;
  recentCompareHistory: CopilotCompareHistoryBrief[];
};

export function defaultCopilotSession(): CopilotSessionPayload {
  return {
    route: "unknown",
    lastSearchQuery: "",
    products: [],
    savedSummaries: [],
    watchlistSummaries: [],
    compareTrayLinks: [],
    subscriptionTier: "free",
    memoryHints: [],
    searchIntelligenceExcerpt: null,
    recentCompareHistory: [],
  };
}

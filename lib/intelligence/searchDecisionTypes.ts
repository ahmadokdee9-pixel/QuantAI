/** Search-wide narrative verdict (distinct from per-listing deal verdicts). */
export type FinalRecommendationKind =
  | "buy_now"
  | "wait"
  | "compare_alternatives"
  | "risky_deal"
  | "hidden_gem"
  | "premium_but_overpriced"
  | "smart_long_term_buy"
  | "cheapest_but_risky"
  | "best_trusted_option";

export type ConfidenceTier = "high" | "moderate" | "low" | "verify_manually";

export type PersonaId =
  | "student"
  | "power_user"
  | "gamer"
  | "family"
  | "professional"
  | "budget_buyer"
  | "luxury_buyer"
  | "long_term_value"
  | "creator"
  | "traveler"
  | "small_business";

export type PersonaCard = {
  id: PersonaId;
  title: string;
  fitScore: number;
  verdict: string;
  body: string;
  suggestedLink: string | null;
  suggestedStore: string | null;
};

export type StoreTrustRow = {
  store: string;
  trust: number;
  tier: "elite" | "strong" | "standard" | "caution";
  marketplaceRisk: "low" | "medium" | "high";
  /** 0–1 · higher = cheaper vs this search’s price band for that store’s best offer. */
  priceFit: number;
};

export type SearchMarketIntel = {
  aggressiveFakeDiscount: boolean;
  ratingInflationRisk: boolean;
  overpricedPremiumSignal: boolean;
  weakLuxuryValue: boolean;
  lowReviewDepthRisk: boolean;
  marketplaceVarianceRisk: boolean;
  cheapestNotSafest: boolean;
};

export type SearchIntelligenceDTO = {
  query: string;
  basketRegionBias: "us" | "eu" | "uk" | "me" | "asia" | "mixed" | "unknown";
  finalRecommendation: FinalRecommendationKind;
  finalHeadline: string;
  finalBody: string;
  buyerUncertaintyScore: number;
  confidenceTier: ConfidenceTier;
  insufficientDataWarnings: string[];
  opportunityCostNote: string;
  whoShouldBuy: string;
  whoShouldAvoid: string;
  timingNote: string;
  upgradeWorthItNote: string | null;
  marketIntel: SearchMarketIntel;
  globalDeal: { link: string; store: string; title: string } | null;
  localDeal: { link: string; store: string; title: string } | null;
  cheapestReliable: { link: string; store: string; title: string } | null;
  mostTrustedListing: { link: string; store: string; title: string } | null;
  personaCards: PersonaCard[];
  trustMatrix: StoreTrustRow[];
  priceSpread: { min: number; max: number; median: number };
};

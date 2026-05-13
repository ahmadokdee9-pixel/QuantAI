/** Canonical QuantAI plans — Stripe-ready; tier from Clerk `publicMetadata.subscriptionTier`. */

export type QuantPlanTier = "free" | "pro" | "premium";

export type SearchIntelligenceLevel = "summary" | "advanced" | "full";

export type PlanDefinition = {
  id: QuantPlanTier;
  name: string;
  tagline: string;
  monthlyPriceEur: number | null;
  /** Max product searches per UTC day (soft cap when Supabase search_history is available). */
  searchesPerDay: number;
  /** Max AI assistant turns per UTC day (enforced when usage table exists; UI + future API). */
  aiIntelligencePerDay: number;
  watchlistMax: number | null;
  savedProductsMax: number | null;
  compareMax: number;
  premiumAlerts: boolean;
  globalDealIntelligence: SearchIntelligenceLevel;
  advancedAdvisor: boolean;
  highlights: string[];
};

export const QUANT_PLANS: Record<QuantPlanTier, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Live search with a focused tray.",
    monthlyPriceEur: 0,
    searchesPerDay: 20,
    aiIntelligencePerDay: 12,
    watchlistMax: 8,
    savedProductsMax: 15,
    compareMax: 3,
    premiumAlerts: false,
    globalDealIntelligence: "summary",
    advancedAdvisor: false,
    highlights: [
      "Signed-in live search",
      "QI scores & 3-way compare",
      "Saved tray (starter)",
      "Watchlist (starter)",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Deeper intelligence for regular buyers.",
    monthlyPriceEur: 19,
    searchesPerDay: 120,
    aiIntelligencePerDay: 80,
    watchlistMax: 60,
    savedProductsMax: null,
    compareMax: 3,
    premiumAlerts: true,
    globalDealIntelligence: "advanced",
    advancedAdvisor: true,
    highlights: [
      "Advanced tray intelligence",
      "Smarter alerts & advisor",
      "Higher daily search & AI caps",
      "Unlimited saved products",
    ],
  },
  premium: {
    id: "premium",
    name: "Power Buyer",
    tagline: "Maximum depth when the cart matters.",
    monthlyPriceEur: 49,
    searchesPerDay: 400,
    aiIntelligencePerDay: 250,
    watchlistMax: null,
    savedProductsMax: null,
    compareMax: 3,
    premiumAlerts: true,
    globalDealIntelligence: "full",
    advancedAdvisor: true,
    highlights: [
      "Full global intelligence",
      "Highest search & AI throughput",
      "Unlimited watchlist",
      "Priority roadmap access",
    ],
  },
};

export function planDefinition(tier: string | null | undefined): PlanDefinition {
  const t = normalizeTier(tier);
  return QUANT_PLANS[t];
}

export function normalizeTier(raw: string | null | undefined): QuantPlanTier {
  if (!raw || typeof raw !== "string") return "free";
  const v = raw.toLowerCase().trim();
  if (v === "pro" || v === "plus") return "pro";
  if (v === "premium" || v === "power" || v === "power_buyer" || v === "business" || v === "enterprise") {
    return "premium";
  }
  return "free";
}

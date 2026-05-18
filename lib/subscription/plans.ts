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
    tagline: "Read the field. Decide with calm.",
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
      "Live tray · QI ranking",
      "Three-way compare",
      "Saved shelf",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Deeper reads for frequent buyers.",
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
      "Advanced field synthesis",
      "Higher daily throughput",
      "Unlimited saves",
    ],
  },
  premium: {
    id: "premium",
    name: "Power Buyer",
    tagline: "Full intelligence for consequential purchases.",
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
      "Full synthesis layer",
      "Maximum throughput",
      "Unlimited watch",
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

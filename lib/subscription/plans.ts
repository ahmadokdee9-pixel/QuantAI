/** Canonical QuantAI plans — Stripe-ready; tier from Clerk `publicMetadata.subscriptionTier`. */

export type QuantPlanTier = "free" | "pro" | "premium";

export type SearchIntelligenceLevel = "summary" | "advanced" | "full";

/** Private-access presentation — UI only; Stripe tier ids unchanged. */
export type PlanAccessPresentation = {
  layerLabel: string;
  accessName: string;
  clearance: string;
  invitation: string;
};

export const PLAN_ACCESS_PRESENTATION: Record<QuantPlanTier, PlanAccessPresentation> = {
  free: {
    layerLabel: "01",
    accessName: "Essential Intelligence",
    clearance: "Everyday product checks",
    invitation: "For everyday product checks.",
  },
  pro: {
    layerLabel: "02",
    accessName: "Advanced Buying Intelligence",
    clearance: "Deeper price and trust reads",
    invitation: "For frequent buyers who want deeper price and trust reads.",
  },
  premium: {
    layerLabel: "03",
    accessName: "Institutional Decision Layer",
    clearance: "High-value purchase clearance",
    invitation: "For serious buyers, teams, and high-value purchases.",
  },
};

export const PLAN_SYNTHESIS_LABEL: Record<QuantPlanTier, string> = {
  free: "Summary synthesis",
  pro: "Advanced synthesis",
  premium: "Full synthesis architecture",
};

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
    tagline: "Market clarity without noise. Read before you commit.",
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
      "Everyday product checks",
      "QI-ranked tray decisions",
      "Three-route compare intelligence",
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
      "Deeper price and trust analysis",
      "Elevated daily intelligence throughput",
      "Advanced seller risk detection",
    ],
  },
  premium: {
    id: "premium",
    name: "Power Buyer",
    tagline: "Full-depth interpretation for purchases that matter.",
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
      "Full trust and timing synthesis",
      "Maximum intelligence throughput",
      "Institutional decision depth",
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

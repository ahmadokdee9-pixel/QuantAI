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
    accessName: "Entry Intelligence Access",
    clearance: "Standard field reads · summary synthesis depth",
    invitation: "Baseline clearance into the commerce intelligence field.",
  },
  pro: {
    layerLabel: "02",
    accessName: "Analyst-Grade Synthesis Layer",
    clearance: "Elevated throughput · advanced synthesis architecture",
    invitation: "Analyst-grade reads for consequential purchase decisions.",
  },
  premium: {
    layerLabel: "03",
    accessName: "Private Institutional Access",
    clearance: "Maximum throughput · full synthesis architecture",
    invitation: "Reserved institutional clearance for private buyers.",
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
      "Entry field reads with QI-ranked tray synthesis",
      "Three-route compare intelligence",
      "Private intelligence shelf · standard depth",
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
      "Analyst-grade commerce synthesis architecture",
      "Elevated daily intelligence throughput",
      "Unlimited intelligence shelf · advanced depth",
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
      "Private institutional synthesis architecture",
      "Maximum intelligence throughput clearance",
      "Unlimited watch intelligence · full depth",
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

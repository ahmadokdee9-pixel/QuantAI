import type { PlanDefinition, QuantPlanTier, SearchIntelligenceLevel } from "./plans";
import { planDefinition } from "./plans";

export type SearchEntitlementsDTO = {
  tier: QuantPlanTier;
  intelligenceLevel: SearchIntelligenceLevel;
  searchesPerDay: number;
  aiIntelligencePerDay: number;
  watchlistMax: number | null;
  savedProductsMax: number | null;
  compareMax: number;
  premiumAlerts: boolean;
  advancedAdvisor: boolean;
};

export function entitlementsFromPlan(plan: PlanDefinition): SearchEntitlementsDTO {
  return {
    tier: plan.id,
    intelligenceLevel: plan.globalDealIntelligence,
    searchesPerDay: plan.searchesPerDay,
    aiIntelligencePerDay: plan.aiIntelligencePerDay,
    watchlistMax: plan.watchlistMax,
    savedProductsMax: plan.savedProductsMax,
    compareMax: plan.compareMax,
    premiumAlerts: plan.premiumAlerts,
    advancedAdvisor: plan.advancedAdvisor,
  };
}

export function entitlementsForTier(tier: string | null | undefined): SearchEntitlementsDTO {
  return entitlementsFromPlan(planDefinition(tier));
}

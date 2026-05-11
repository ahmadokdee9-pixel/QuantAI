export { enrichProductsWithIntelligence } from "./enrichProducts";
export { inferProductCategory, inferSearchCategory, getCategoryWeights } from "./categoryContext";
export { computeListStats } from "./scoringEngine";
export type { IntelligenceSignals, ListStats, ProductCategorySlug } from "./types";
export { simulatePriceTrend } from "./priceTrendSim";
export { recordSearchHistory, mergeRecommendationMemory, memoryPatchFromSearch } from "./persistence";
export { buildSearchIntelligence, inferBasketRegionBias } from "./searchDecisionEngine";
export type {
  ConfidenceTier,
  FinalRecommendationKind,
  PersonaCard,
  PersonaId,
  SearchIntelligenceDTO,
  SearchMarketIntel,
  StoreTrustRow,
} from "./searchDecisionTypes";

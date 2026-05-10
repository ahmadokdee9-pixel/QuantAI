export { enrichProductsWithIntelligence } from "./enrichProducts";
export { inferProductCategory, inferSearchCategory, getCategoryWeights } from "./categoryContext";
export { computeListStats } from "./scoringEngine";
export type { IntelligenceSignals, ListStats, ProductCategorySlug } from "./types";
export { simulatePriceTrend } from "./priceTrendSim";
export { recordSearchHistory, mergeRecommendationMemory, memoryPatchFromSearch } from "./persistence";

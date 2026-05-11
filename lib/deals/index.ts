export { buildDealClusters } from "./buildClusters";
export { analyzeDealCluster, fakeDiscountRisk, dealVerdictFor } from "./dealAnalysis";
export { inferDealMarketSegment } from "./dealCategoryWeights";
export { extractProductIdentity } from "./productIdentity";
export type {
  BuyVsWait,
  ClusterPicks,
  DataCompleteness,
  DealClusterDTO,
  DealVerdict,
  FakeDiscountRisk,
  ListingDealInsight,
  MarketplaceSellerRisk,
  PrimaryDealAction,
} from "./types";

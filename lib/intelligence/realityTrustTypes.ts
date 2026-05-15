/** Shared types for Reality & Trust layer — avoids circular imports with `shoppingScore`. */

export type RealityBand = "highly_realistic" | "acceptable" | "caution" | "suspicious";

export type QuantAIRealityTrustLayer = {
  realityScore: number;
  realityBand: RealityBand;
  fakeDiscountProbability: number;
  discountManipulationRisk: number;
  urgencyManipulationRisk: number;
  emotionalTrapScore: number;
  retailerReliability01: number;
  marketplaceRisk01: number;
  weakRetailer: boolean;
  listingSpecGap01: number;
  imageTitleMismatchRisk: number;
  stockVolatility01: number;
  tooGoodToBeTrue01: number;
};

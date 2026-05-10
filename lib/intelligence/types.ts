/** Normalized 0–100 signal strengths for UI / debugging. */
export type IntelligenceSignals = {
  priceFit: number;
  rating: number;
  reviewDepth: number;
  retailerTrust: number;
  delivery: number;
  popularity: number;
  pricePerformance: number;
  discountQuality: number;
  categoryFit: number;
};

export type ListStats = {
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  maxReviews: number;
  avgRating: number;
  medianRating: number;
};

export type ProductCategorySlug =
  | "electronics"
  | "fashion"
  | "home"
  | "beauty"
  | "sports"
  | "toys"
  | "general";

export type CategoryWeightProfile = {
  price: number;
  rating: number;
  reviewDepth: number;
  retailerTrust: number;
  delivery: number;
  popularity: number;
  pricePerformance: number;
  discountQuality: number;
};

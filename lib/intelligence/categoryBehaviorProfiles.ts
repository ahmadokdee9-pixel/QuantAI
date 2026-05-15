/**
 * Category-specific commerce psychology & economics — weights for consensus blending only.
 */

import type { ProductCategorySlug } from "./types";

export type CategoryBehaviorProfile = {
  slug: ProductCategorySlug;
  /** Higher = emotional marketing tolerated more (luxury / fashion). */
  emotionalTolerance01: number;
  /** Higher = fake / inflated discount signals weigh more heavily. */
  fakeDiscountWeight: number;
  /** Higher = predictive timing & price momentum matter more. */
  timingWeight: number;
  /** Higher = retailer trust dominates the blend. */
  trustWeight: number;
  /** Higher = tray volatility suppresses confidence faster. */
  volatilityWeight: number;
  /** Higher = shipping / fulfillment proxies matter more (furniture / bulky). */
  logisticsWeight: number;
  /** Price above median * this factor counts as “premium” for evidence bars. */
  premiumPriceRatio: number;
  /** Multiplier on evidence required before buy_now on premium rows. */
  premiumEvidenceMultiplier: number;
};

const DEFAULT: CategoryBehaviorProfile = {
  slug: "general",
  emotionalTolerance01: 0.42,
  fakeDiscountWeight: 1,
  timingWeight: 0.85,
  trustWeight: 1,
  volatilityWeight: 0.9,
  logisticsWeight: 0.75,
  premiumPriceRatio: 1.35,
  premiumEvidenceMultiplier: 1.12,
};

const ELECTRONICS: CategoryBehaviorProfile = {
  slug: "electronics",
  emotionalTolerance01: 0.32,
  fakeDiscountWeight: 0.95,
  timingWeight: 1.25,
  trustWeight: 1.05,
  volatilityWeight: 1.2,
  logisticsWeight: 0.7,
  premiumPriceRatio: 1.28,
  premiumEvidenceMultiplier: 1.22,
};

const FASHION: CategoryBehaviorProfile = {
  slug: "fashion",
  emotionalTolerance01: 0.62,
  fakeDiscountWeight: 0.88,
  timingWeight: 0.72,
  trustWeight: 0.95,
  volatilityWeight: 0.85,
  logisticsWeight: 0.55,
  premiumPriceRatio: 1.42,
  premiumEvidenceMultiplier: 1.08,
};

const HOME: CategoryBehaviorProfile = {
  slug: "home",
  emotionalTolerance01: 0.38,
  fakeDiscountWeight: 1.02,
  timingWeight: 0.78,
  trustWeight: 1.18,
  volatilityWeight: 0.82,
  logisticsWeight: 1.35,
  premiumPriceRatio: 1.32,
  premiumEvidenceMultiplier: 1.18,
};

const BEAUTY: CategoryBehaviorProfile = {
  slug: "beauty",
  emotionalTolerance01: 0.4,
  fakeDiscountWeight: 1.35,
  timingWeight: 0.68,
  trustWeight: 1.22,
  volatilityWeight: 0.75,
  logisticsWeight: 0.6,
  premiumPriceRatio: 1.38,
  premiumEvidenceMultiplier: 1.15,
};

const SPORTS: CategoryBehaviorProfile = {
  slug: "sports",
  emotionalTolerance01: 0.45,
  fakeDiscountWeight: 0.92,
  timingWeight: 0.88,
  trustWeight: 1,
  volatilityWeight: 0.95,
  logisticsWeight: 0.72,
  premiumPriceRatio: 1.3,
  premiumEvidenceMultiplier: 1.1,
};

const TOYS: CategoryBehaviorProfile = {
  slug: "toys",
  emotionalTolerance01: 0.48,
  fakeDiscountWeight: 1.05,
  timingWeight: 0.8,
  trustWeight: 1.05,
  volatilityWeight: 0.88,
  logisticsWeight: 0.65,
  premiumPriceRatio: 1.25,
  premiumEvidenceMultiplier: 1.06,
};

const BY_SLUG: Record<ProductCategorySlug, CategoryBehaviorProfile> = {
  general: DEFAULT,
  electronics: ELECTRONICS,
  fashion: FASHION,
  home: HOME,
  beauty: BEAUTY,
  sports: SPORTS,
  toys: TOYS,
};

export function getCategoryBehaviorProfile(slug: ProductCategorySlug | undefined): CategoryBehaviorProfile {
  if (!slug) return DEFAULT;
  return BY_SLUG[slug] ?? DEFAULT;
}

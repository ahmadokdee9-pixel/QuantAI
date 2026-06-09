/**
 * Phase 1D.5 — Truth foundation snapshot types for gate integration.
 */

import type { AvailabilityStatus } from "@/lib/truth/availabilityObservationTypes";
import type {
  BaselineCoverage,
  DiscountEvidence,
  DiscountVerificationState,
  PriceTruthBundle,
} from "@/lib/truth/priceHistoryTypes";

export type AvailabilityFreshnessSnapshot = {
  freshnessScore: number;
  listingAgeHours: number;
  observedAt: string | null;
  availabilityStatus: AvailabilityStatus | "unknown";
};

export type TruthFoundationSnapshot = {
  version: 1;
  canonicalSkuId: string | null;
  skuIdentityConfidence: number;
  availability: AvailabilityFreshnessSnapshot;
  priceTruth: PriceTruthBundle | null;
  discountEvidence: DiscountEvidence | null;
  baselineCoverage: BaselineCoverage | null;
  priceTruthConfidence: number;
};

export type ExtendedTruthEvidenceSources = {
  priceHistorySamples: number;
  identityConfidence: number;
  marketCoverageScore: number;
  discountProofScore: number;
  discountFake: boolean;
  merchantTrustScore: number;
  hasListingPrice: boolean;
  priceTruthConfidence: number;
  discountEvidence: DiscountEvidence | null;
  baselineCoverage: BaselineCoverage | null;
  availabilityFreshness: number;
  listingAgeHours: number;
  availabilityStatus: AvailabilityStatus | "unknown";
  canonicalSkuId: string | null;
  skuIdentityConfidence: number;
  discountVerificationState: DiscountVerificationState | null;
};

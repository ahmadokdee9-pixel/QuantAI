/**
 * Phase 1D.5 + 1E + 1F — Truth foundation snapshot types for gate integration.
 */

import type { AvailabilityConsensus } from "@/lib/truth/availabilityConsensusModel";
import type { AvailabilityState } from "@/lib/truth/availabilityStateModel";
import type { AvailabilityStatus } from "@/lib/truth/availabilityObservationTypes";
import type { TruthDebugTrace } from "@/lib/truth/truthDebug";
import type {
  BaselineCoverage,
  DiscountEvidence,
  DiscountVerificationState,
  HistoricalPriceObservationRow,
  PriceTruthBundle,
} from "@/lib/truth/priceHistoryTypes";
import type { AvailabilityObservationRow } from "@/lib/truth/availabilityObservationTypes";

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
  availabilityState: AvailabilityState;
  availability: AvailabilityFreshnessSnapshot;
  priceTruth: PriceTruthBundle | null;
  discountEvidence: DiscountEvidence | null;
  baselineCoverage: BaselineCoverage | null;
  priceTruthConfidence: number;
  merchantCount: number;
  availabilityConsensus: AvailabilityConsensus;
  crossMerchantReferencePrice: number | null;
  marketPriceSpread: number | null;
  merchantAgreementScore: number;
  listingPriceOutlier: boolean;
  debugTrace?: TruthDebugTrace | null;
};

export type TruthFoundationPrefetchEntry = {
  listingUrl: string;
  canonicalSkuId: string;
  skuIdentityConfidence: number;
  availabilityObservation: AvailabilityObservationRow | null;
  priceObservations: HistoricalPriceObservationRow[];
  availabilityDataSource: "db" | "inline";
  priceHistoryDataSource: "db" | "memory" | "inline";
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
  availabilityState: AvailabilityState;
  availabilityFreshness: number;
  listingAgeHours: number;
  availabilityStatus: AvailabilityStatus | "unknown";
  canonicalSkuId: string | null;
  skuIdentityConfidence: number;
  discountVerificationState: DiscountVerificationState | null;
  merchantCount: number;
  availabilityConsensus: AvailabilityConsensus;
  crossMerchantReferencePrice: number | null;
  marketPriceSpread: number | null;
  merchantAgreementScore: number;
  listingPriceOutlier: boolean;
  currentListingPrice: number | null;
};

export type { AvailabilityState } from "@/lib/truth/availabilityStateModel";
export type { AvailabilityConsensus } from "@/lib/truth/availabilityConsensusModel";

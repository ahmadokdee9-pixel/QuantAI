/**
 * Phase 1D — Price history + discount verification types.
 */

import type { QualifiedDiscountProofBand } from "@/lib/truth/truthLanguagePolicy";
import type { AvailabilityStatus } from "@/lib/truth/availabilityObservationTypes";

export const DISCOUNT_VERIFICATION_STATES = [
  "VERIFIED_DISCOUNT",
  "POSSIBLE_DISCOUNT",
  "UNVERIFIED_DISCOUNT",
  "NO_DISCOUNT",
] as const;

/** Internal pipeline state — map to qualified labels for user-facing output (Phase 1A). */
export type DiscountVerificationState = (typeof DISCOUNT_VERIFICATION_STATES)[number];

export type HistoricalPriceObservationRow = {
  id: string;
  canonical_sku_id: string;
  merchant_key: string;
  listing_url: string | null;
  observed_price: number;
  currency: string;
  observed_at: string;
  availability_status: string | null;
  source: string;
  created_at: string;
};

export type HistoricalPriceObservationInsert = {
  canonical_sku_id: string;
  merchant_key: string;
  listing_url?: string | null;
  observed_price: number;
  currency?: string;
  observed_at?: string;
  availability_status?: AvailabilityStatus | string | null;
  source?: string;
};

export type PriceWindowBaseline = {
  windowDays: 30 | 90 | 365;
  sampleCount: number;
  minPrice: number | null;
  medianPrice: number | null;
  averagePrice: number | null;
  currentPriceDeltaPct: number | null;
  coveragePct: number;
};

export type PriceHistoryBaselines = {
  canonicalSkuId: string;
  currentPrice: number;
  currency: string;
  totalSamples: number;
  window30d: PriceWindowBaseline;
  window90d: PriceWindowBaseline;
  window365d: PriceWindowBaseline;
};

export type ReferencePriceSnapshot = {
  referencePrice30d: number | null;
  referencePrice90d: number | null;
  referencePrice365d: number | null;
  primaryReference: number | null;
  primaryWindowDays: 30 | 90 | 365 | null;
  method: "median" | "average" | "min" | "none";
};

export type BaselineCoverage = {
  samples30d: number;
  samples90d: number;
  samples365d: number;
  sufficientForVerification: boolean;
  sufficientForStrongVerification: boolean;
  coverageScore: number;
};

export type FakeDiscountFlag =
  | "inflated_reference_price"
  | "temporary_markup_before_sale"
  | "insufficient_history";

export type FakeDiscountAssessment = {
  isFake: boolean;
  flags: FakeDiscountFlag[];
  confidence: number;
  reasoning: string;
};

export type DiscountEvidence = {
  state: DiscountVerificationState;
  qualifiedBand: QualifiedDiscountProofBand;
  discountPctVsReference: number | null;
  referenceWindowDays: 30 | 90 | 365 | null;
  sampleCount: number;
  evidenceSummary: string;
};

export type DiscountVerificationResult = {
  state: DiscountVerificationState;
  qualifiedBand: QualifiedDiscountProofBand;
  discountPctVsReference: number | null;
  referencePriceUsed: number | null;
  referenceWindowDays: 30 | 90 | 365 | null;
  reasoning: string;
};

export type PriceTruthBundle = {
  priceTruthConfidence: number;
  discountEvidence: DiscountEvidence;
  baselineCoverage: BaselineCoverage;
  baselines: PriceHistoryBaselines;
  referencePrices: ReferencePriceSnapshot;
  verification: DiscountVerificationResult;
  fakeDiscount: FakeDiscountAssessment;
};

export const PRICE_TRUTH_MIN_SAMPLES_WEAK = 2;
export const PRICE_TRUTH_MIN_SAMPLES_VERIFY = 5;
export const PRICE_TRUTH_MIN_SAMPLES_STRONG = 8;

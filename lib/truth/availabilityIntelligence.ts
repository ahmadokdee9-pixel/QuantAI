/**
 * Phase 1B.2 — Availability intelligence layer (barrel exports).
 * No UI, verdict, or cron wiring.
 */

export {
  CLASSIFIED_AVAILABILITY_LABELS,
  classifyAvailability,
  classifySerpApiShoppingRow,
  classifiedLabelToDbStatus,
  dbStatusToClassifiedLabel,
  isClassifiedAvailabilityLabel,
  parseSerpApiAvailabilitySignals,
  type AvailabilityClassification,
  type ClassifiedAvailabilityLabel,
  type SerpApiAvailabilitySignals,
} from "@/lib/truth/availabilityClassifier";

export {
  computeFreshnessScoreFromAgeHours,
  computeFreshnessScoreFromObservedAt,
  computeObservationAgeHours,
  type FreshnessBand,
  type FreshnessScoreResult,
} from "@/lib/truth/freshnessScore";

export {
  DEFAULT_MAJOR_PRICE_DROP_PCT,
  DEFAULT_MAJOR_PRICE_UP_PCT,
  detectAvailabilityChanges,
  type AvailabilityChangeAlert,
  type AvailabilityChangeDetection,
  type AvailabilityChangeKind,
  type AvailabilityObservationSnapshot,
} from "@/lib/truth/availabilityChangeDetector";

export {
  buildNormalizedAvailabilityObservation,
  buildObservationFromMatchedProduct,
  buildObservationFromRefreshMiss,
  buildObservationFromSerpApiRow,
  matchListingInSearchResults,
  normalizeListingUrlForMatch,
  type ListingMatchResult,
  type ListingRefreshTarget,
  type NormalizedAvailabilityObservation,
} from "@/lib/truth/listingRefreshAdapter";

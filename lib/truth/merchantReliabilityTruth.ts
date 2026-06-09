/**
 * Phase 1H — Merchant reliability truth from listing merchant observations.
 */

import { normalizeMerchantKey } from "@/lib/truth/crossMerchantLinking";
import { computeFreshnessScoreFromAgeHours, computeObservationAgeHours } from "@/lib/truth/freshnessScore";
import type { AvailabilityObservationRow } from "@/lib/truth/availabilityObservationTypes";
import type { HistoricalPriceObservationRow } from "@/lib/truth/priceHistoryTypes";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 90;

export type MerchantReliabilityState = "RELIABLE" | "VOLATILE" | "UNRELIABLE" | "STALE" | "UNKNOWN";

export type MerchantReliabilitySnapshot = {
  merchantReliabilityScore: number;
  merchantAvailabilityReliability: number;
  merchantPricingReliability: number;
  merchantFreshnessReliability: number;
  merchantVolatilityScore: number;
  merchantState: MerchantReliabilityState;
};

export const UNRELIABLE_MERCHANT_THRESHOLD = 45;
export const HIGH_VOLATILITY_THRESHOLD = 65;
export const POOR_AVAILABILITY_RELIABILITY_THRESHOLD = 50;
export const STALE_FRESHNESS_RELIABILITY_THRESHOLD = 50;
export const POOR_PRICING_RELIABILITY_THRESHOLD = 45;
export const MIN_MERCHANT_OBSERVATIONS_FOR_GATES = 2;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function parseTs(value: string): number {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean <= 0) return 0;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

const AVAILABLE = new Set(["in_stock", "limited"]);
const UNAVAILABLE = new Set(["out_of_stock", "removed", "seller_unavailable"]);

function computeAvailabilityReliability(args: {
  priceObservations: HistoricalPriceObservationRow[];
  availabilityObservation: AvailabilityObservationRow | null;
}): number {
  const statuses: string[] = [];
  for (const row of args.priceObservations) {
    if (row.availability_status) statuses.push(row.availability_status);
  }
  if (args.availabilityObservation?.availability) statuses.push(args.availabilityObservation.availability);

  if (statuses.length === 0) return 50;

  let available = 0;
  let unavailable = 0;
  for (const status of statuses) {
    if (AVAILABLE.has(status)) available += 1;
    else if (UNAVAILABLE.has(status)) unavailable += 1;
  }

  const known = available + unavailable;
  if (known === 0) return 44;
  const ratio = available / known;
  return clampScore(40 + ratio * 60 - (unavailable / statuses.length) * 20);
}

function computePricingReliability(args: {
  prices: number[];
  currentPrice: number | null;
  referencePrice: number | null;
}): number {
  if (args.prices.length === 0) return 50;

  let score = 78;
  const cv = coefficientOfVariation(args.prices);
  if (cv >= 0.18) score -= 28;
  else if (cv >= 0.1) score -= 14;
  else if (cv <= 0.04) score += 8;

  const merchantMedian = median(args.prices);
  if (args.currentPrice != null && merchantMedian != null && merchantMedian > 0) {
    const deviation = Math.abs(args.currentPrice - merchantMedian) / merchantMedian;
    if (deviation >= 0.25) score -= 22;
    else if (deviation >= 0.15) score -= 10;
  }

  if (
    args.currentPrice != null &&
    args.referencePrice != null &&
    args.referencePrice > 0 &&
    args.currentPrice > args.referencePrice * 1.18
  ) {
    score -= 16;
  }

  return clampScore(score);
}

function computeFreshnessReliability(args: {
  priceObservations: HistoricalPriceObservationRow[];
  availabilityObservation: AvailabilityObservationRow | null;
  listingAgeHours: number;
  now?: Date;
}): number {
  const now = args.now ?? new Date();
  let score = 50;

  const latestPriceObs = args.priceObservations
    .map((row) => row.observed_at)
    .sort((a, b) => parseTs(b) - parseTs(a))[0];
  if (latestPriceObs) {
    score = computeFreshnessScoreFromAgeHours(computeObservationAgeHours(latestPriceObs, now));
  }

  if (args.availabilityObservation) {
    const obsScore =
      args.availabilityObservation.freshness_score ??
      computeFreshnessScoreFromAgeHours(computeObservationAgeHours(args.availabilityObservation.observed_at, now));
    score = Math.round((score + obsScore) / 2);
  } else if (args.listingAgeHours > 24) {
    score = Math.min(score, computeFreshnessScoreFromAgeHours(args.listingAgeHours));
  }

  return clampScore(score);
}

function computeVolatilityScore(prices: number[]): number {
  if (prices.length < 2) return 0;
  const cv = coefficientOfVariation(prices);
  return clampScore(cv * 220);
}

function deriveMerchantState(args: {
  observationCount: number;
  merchantReliabilityScore: number;
  merchantFreshnessReliability: number;
  merchantVolatilityScore: number;
  listingAgeHours: number;
  hasAvailabilityObservation: boolean;
}): MerchantReliabilityState {
  if (args.observationCount === 0) return "UNKNOWN";

  if (
    args.merchantFreshnessReliability < STALE_FRESHNESS_RELIABILITY_THRESHOLD ||
    (args.hasAvailabilityObservation && args.listingAgeHours > 24)
  ) {
    return "STALE";
  }
  if (args.merchantVolatilityScore >= HIGH_VOLATILITY_THRESHOLD) return "VOLATILE";
  if (args.merchantReliabilityScore < UNRELIABLE_MERCHANT_THRESHOLD) return "UNRELIABLE";
  return "RELIABLE";
}

/** Build merchant reliability snapshot for the listing merchant. */
export function buildMerchantReliabilityTruth(args: {
  store: string;
  listingUrl: string;
  observations: HistoricalPriceObservationRow[];
  availabilityObservation: AvailabilityObservationRow | null;
  currentPrice?: number | null;
  referencePrice?: number | null;
  listingAgeHours?: number;
  now?: Date;
}): MerchantReliabilitySnapshot & { merchantObservationCount: number } {
  const merchantKey = normalizeMerchantKey(args.store, args.listingUrl);
  const now = args.now ?? new Date();
  const cutoff = now.getTime() - WINDOW_DAYS * MS_PER_DAY;

  const merchantPriceObs = args.observations.filter(
    (row) => row.merchant_key === merchantKey && parseTs(row.observed_at) >= cutoff
  );
  const prices = merchantPriceObs.map((row) => row.observed_price).filter((price) => price > 0);
  const observationCount = merchantPriceObs.length + (args.availabilityObservation ? 1 : 0);

  const merchantAvailabilityReliability = computeAvailabilityReliability({
    priceObservations: merchantPriceObs,
    availabilityObservation: args.availabilityObservation,
  });
  const merchantPricingReliability = computePricingReliability({
    prices,
    currentPrice: args.currentPrice ?? null,
    referencePrice: args.referencePrice ?? null,
  });
  const merchantFreshnessReliability = computeFreshnessReliability({
    priceObservations: merchantPriceObs,
    availabilityObservation: args.availabilityObservation,
    listingAgeHours: args.listingAgeHours ?? 0,
    now,
  });
  const merchantVolatilityScore = computeVolatilityScore(prices);

  const stabilityComponent = 100 - merchantVolatilityScore;
  const merchantReliabilityScore = clampScore(
    merchantAvailabilityReliability * 0.25 +
      merchantPricingReliability * 0.3 +
      merchantFreshnessReliability * 0.25 +
      stabilityComponent * 0.2
  );

  const merchantState = deriveMerchantState({
    observationCount,
    merchantReliabilityScore,
    merchantFreshnessReliability,
    merchantVolatilityScore,
    listingAgeHours: args.listingAgeHours ?? 0,
    hasAvailabilityObservation: Boolean(args.availabilityObservation),
  });

  return {
    merchantReliabilityScore,
    merchantAvailabilityReliability,
    merchantPricingReliability,
    merchantFreshnessReliability,
    merchantVolatilityScore,
    merchantState,
    merchantObservationCount: observationCount,
  };
}

export function hasMerchantReliabilitySignal(observationCount: number): boolean {
  return observationCount >= MIN_MERCHANT_OBSERVATIONS_FOR_GATES;
}

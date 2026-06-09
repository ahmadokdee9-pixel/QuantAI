/**
 * Phase 1F — Cross-merchant truth aggregation from canonical SKU observations.
 */

import { deriveAvailabilityConsensus, type AvailabilityConsensus } from "@/lib/truth/availabilityConsensusModel";
import type { HistoricalPriceObservationRow } from "@/lib/truth/priceHistoryTypes";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 90;
export const PRICE_OUTLIER_HIGH_RATIO = 1.22;
export const WEAK_MERCHANT_AGREEMENT_THRESHOLD = 55;
export const MIN_MERCHANTS_FOR_CROSS_MERCHANT_GATES = 2;

export type CrossMerchantTruthAggregation = {
  merchantCount: number;
  availabilityConsensus: AvailabilityConsensus;
  crossMerchantReferencePrice: number | null;
  marketPriceSpread: number | null;
  merchantAgreementScore: number;
  medianPrice: number | null;
  trimmedMeanPrice: number | null;
  listingPriceOutlier: boolean;
};

type MerchantLatest = {
  merchantKey: string;
  price: number;
  availabilityStatus: string | null;
  observedAt: string;
};

function parseTs(value: string): number {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function latestPerMerchant(
  observations: HistoricalPriceObservationRow[],
  now: Date = new Date()
): MerchantLatest[] {
  const cutoff = now.getTime() - WINDOW_DAYS * MS_PER_DAY;
  const byMerchant = new Map<string, MerchantLatest>();

  for (const row of observations) {
    if (parseTs(row.observed_at) < cutoff) continue;
    if (!Number.isFinite(row.observed_price) || row.observed_price <= 0) continue;

    const prior = byMerchant.get(row.merchant_key);
    if (!prior || parseTs(row.observed_at) >= parseTs(prior.observedAt)) {
      byMerchant.set(row.merchant_key, {
        merchantKey: row.merchant_key,
        price: row.observed_price,
        availabilityStatus: row.availability_status,
        observedAt: row.observed_at,
      });
    }
  }

  return [...byMerchant.values()];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function rejectOutliers(values: number[]): number[] {
  if (values.length < 3) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)]!;
  const q3 = sorted[Math.floor(sorted.length * 0.75)]!;
  const iqr = q3 - q1;
  const low = q1 - 1.5 * iqr;
  const high = q3 + 1.5 * iqr;
  const filtered = sorted.filter((v) => v >= low && v <= high);
  return filtered.length >= 2 ? filtered : sorted;
}

function trimmedMean(values: number[], trimFraction = 0.1): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const trim = Math.floor(sorted.length * trimFraction);
  const slice = sorted.slice(trim, sorted.length - trim || sorted.length);
  const use = slice.length > 0 ? slice : sorted;
  return use.reduce((sum, v) => sum + v, 0) / use.length;
}

function computeMarketSpreadPct(values: number[]): number | null {
  if (values.length < 2) return null;
  const med = median(values);
  if (med == null || med <= 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return ((max - min) / med) * 100;
}

function computeMerchantAgreementScore(args: {
  merchantCount: number;
  availabilityConsensus: AvailabilityConsensus;
  marketPriceSpread: number | null;
}): number {
  let score = 45;

  if (args.merchantCount >= 4) score += 25;
  else if (args.merchantCount >= 3) score += 18;
  else if (args.merchantCount >= 2) score += 10;

  switch (args.availabilityConsensus) {
    case "CONSENSUS_AVAILABLE":
      score += 18;
      break;
    case "CONSENSUS_UNAVAILABLE":
      score += 4;
      break;
    case "CONSENSUS_CONFLICT":
      score -= 28;
      break;
    case "CONSENSUS_UNKNOWN":
    default:
      score -= 8;
      break;
  }

  const spread = args.marketPriceSpread;
  if (spread != null) {
    if (spread <= 8) score += 12;
    else if (spread <= 15) score += 4;
    else if (spread >= 25) score -= 18;
    else if (spread >= 18) score -= 10;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

/** Aggregate cross-merchant truth for one canonical SKU listing. */
export function aggregateCrossMerchantTruth(args: {
  observations: HistoricalPriceObservationRow[];
  currentPrice?: number | null;
  now?: Date;
}): CrossMerchantTruthAggregation {
  const merchantLatest = latestPerMerchant(args.observations, args.now);
  const merchantCount = merchantLatest.length;
  const prices = merchantLatest.map((row) => row.price);

  const availabilityConsensus = deriveAvailabilityConsensus(
    merchantLatest.map((row) => row.availabilityStatus)
  );

  const cleanedPrices = rejectOutliers(prices);
  const medianPrice = median(cleanedPrices);
  const trimmedMeanPrice = trimmedMean(cleanedPrices);
  const crossMerchantReferencePrice =
    medianPrice != null && trimmedMeanPrice != null
      ? Math.round(((medianPrice + trimmedMeanPrice) / 2) * 100) / 100
      : medianPrice ?? trimmedMeanPrice;

  const marketPriceSpread = computeMarketSpreadPct(cleanedPrices);
  const merchantAgreementScore = computeMerchantAgreementScore({
    merchantCount,
    availabilityConsensus,
    marketPriceSpread,
  });

  const currentPrice = args.currentPrice ?? null;
  const listingPriceOutlier =
    currentPrice != null &&
    crossMerchantReferencePrice != null &&
    crossMerchantReferencePrice > 0 &&
    merchantCount >= MIN_MERCHANTS_FOR_CROSS_MERCHANT_GATES &&
    currentPrice > crossMerchantReferencePrice * PRICE_OUTLIER_HIGH_RATIO;

  return {
    merchantCount,
    availabilityConsensus,
    crossMerchantReferencePrice,
    marketPriceSpread,
    merchantAgreementScore,
    medianPrice,
    trimmedMeanPrice,
    listingPriceOutlier,
  };
}

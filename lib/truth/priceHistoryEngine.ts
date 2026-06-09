/**
 * Phase 1D — Price history engine (canonical SKU baselines from observations).
 */

import type {
  BaselineCoverage,
  HistoricalPriceObservationRow,
  PriceHistoryBaselines,
  PriceWindowBaseline,
} from "@/lib/truth/priceHistoryTypes";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseTs(value: string): number | null {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function filterWindow(
  observations: HistoricalPriceObservationRow[],
  windowDays: number,
  nowMs: number
): HistoricalPriceObservationRow[] {
  const cutoff = nowMs - windowDays * MS_PER_DAY;
  return observations.filter((row) => {
    const ts = parseTs(row.observed_at);
    return ts != null && ts >= cutoff;
  });
}

function buildWindowBaseline(args: {
  windowDays: 30 | 90 | 365;
  observations: HistoricalPriceObservationRow[];
  currentPrice: number;
}): PriceWindowBaseline {
  const prices = args.observations.map((row) => row.observed_price).filter((p) => p > 0);
  const sampleCount = prices.length;
  const minPrice = sampleCount ? Math.min(...prices) : null;
  const medianPrice = median(prices);
  const averagePrice = average(prices);
  const reference = medianPrice ?? averagePrice;
  const currentPriceDeltaPct =
    reference != null && reference > 0 ? ((args.currentPrice - reference) / reference) * 100 : null;
  const coveragePct = Math.min(100, Math.round((sampleCount / Math.max(1, args.windowDays / 7)) * 100));

  return {
    windowDays: args.windowDays,
    sampleCount,
    minPrice,
    medianPrice,
    averagePrice,
    currentPriceDeltaPct,
    coveragePct,
  };
}

/** Build 30d / 90d / 365d baselines from historical observations. */
export function buildPriceHistoryBaselines(args: {
  canonicalSkuId: string;
  currentPrice: number;
  currency?: string;
  observations: HistoricalPriceObservationRow[];
  now?: Date;
}): PriceHistoryBaselines {
  const nowMs = (args.now ?? new Date()).getTime();
  const currency = args.currency ?? args.observations[0]?.currency ?? "EUR";
  const sorted = [...args.observations].sort(
    (a, b) => (parseTs(b.observed_at) ?? 0) - (parseTs(a.observed_at) ?? 0)
  );

  const w30 = filterWindow(sorted, 30, nowMs);
  const w90 = filterWindow(sorted, 90, nowMs);
  const w365 = filterWindow(sorted, 365, nowMs);

  return {
    canonicalSkuId: args.canonicalSkuId,
    currentPrice: args.currentPrice,
    currency,
    totalSamples: sorted.length,
    window30d: buildWindowBaseline({ windowDays: 30, observations: w30, currentPrice: args.currentPrice }),
    window90d: buildWindowBaseline({ windowDays: 90, observations: w90, currentPrice: args.currentPrice }),
    window365d: buildWindowBaseline({ windowDays: 365, observations: w365, currentPrice: args.currentPrice }),
  };
}

export function computeBaselineCoverage(baselines: PriceHistoryBaselines): BaselineCoverage {
  const samples30d = baselines.window30d.sampleCount;
  const samples90d = baselines.window90d.sampleCount;
  const samples365d = baselines.window365d.sampleCount;
  const sufficientForVerification = samples90d >= 5;
  const sufficientForStrongVerification = samples90d >= 8 && samples365d >= 12;
  const coverageScore = Math.min(
    100,
    Math.round(samples30d * 8 + samples90d * 4 + samples365d * 1.5)
  );
  return {
    samples30d,
    samples90d,
    samples365d,
    sufficientForVerification,
    sufficientForStrongVerification,
    coverageScore,
  };
}

/**
 * Phase 1D — Reference price engine (median-first baselines).
 */

import type {
  PriceHistoryBaselines,
  PriceWindowBaseline,
  ReferencePriceSnapshot,
} from "@/lib/truth/priceHistoryTypes";

const MIN_MEDIAN_SAMPLES = 3;
const MIN_AVERAGE_SAMPLES = 2;

function resolveReferenceFromWindow(window: PriceWindowBaseline): number | null {
  if (window.sampleCount >= MIN_MEDIAN_SAMPLES && window.medianPrice != null) return window.medianPrice;
  if (window.sampleCount >= MIN_AVERAGE_SAMPLES && window.averagePrice != null) return window.averagePrice;
  if (window.sampleCount >= 1 && window.minPrice != null) return window.minPrice;
  return null;
}

function resolveMethod(window: PriceWindowBaseline): ReferencePriceSnapshot["method"] {
  if (window.sampleCount >= MIN_MEDIAN_SAMPLES && window.medianPrice != null) return "median";
  if (window.sampleCount >= MIN_AVERAGE_SAMPLES && window.averagePrice != null) return "average";
  if (window.sampleCount >= 1 && window.minPrice != null) return "min";
  return "none";
}

/** Produce reference prices for 30d / 90d / 365d windows. */
export function buildReferencePriceSnapshot(baselines: PriceHistoryBaselines): ReferencePriceSnapshot {
  const referencePrice30d = resolveReferenceFromWindow(baselines.window30d);
  const referencePrice90d = resolveReferenceFromWindow(baselines.window90d);
  const referencePrice365d = resolveReferenceFromWindow(baselines.window365d);

  let primaryReference: number | null = null;
  let primaryWindowDays: ReferencePriceSnapshot["primaryWindowDays"] = null;
  let method: ReferencePriceSnapshot["method"] = "none";

  if (referencePrice90d != null && baselines.window90d.sampleCount >= MIN_MEDIAN_SAMPLES) {
    primaryReference = referencePrice90d;
    primaryWindowDays = 90;
    method = resolveMethod(baselines.window90d);
  } else if (referencePrice30d != null && baselines.window30d.sampleCount >= MIN_AVERAGE_SAMPLES) {
    primaryReference = referencePrice30d;
    primaryWindowDays = 30;
    method = resolveMethod(baselines.window30d);
  } else if (referencePrice365d != null) {
    primaryReference = referencePrice365d;
    primaryWindowDays = 365;
    method = resolveMethod(baselines.window365d);
  }

  return {
    referencePrice30d,
    referencePrice90d,
    referencePrice365d,
    primaryReference,
    primaryWindowDays,
    method,
  };
}

/**
 * Phase 1D — Fake discount detection (evidence-based).
 */

import type {
  FakeDiscountAssessment,
  FakeDiscountFlag,
  HistoricalPriceObservationRow,
  PriceHistoryBaselines,
  ReferencePriceSnapshot,
} from "@/lib/truth/priceHistoryTypes";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseTs(value: string): number {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

/** Detect inflated reference prices, markup-then-sale patterns, and thin history. */
export function detectFakeDiscount(args: {
  currentPrice: number;
  marketedOldPrice?: number | null;
  baselines: PriceHistoryBaselines;
  referencePrices: ReferencePriceSnapshot;
  observations: HistoricalPriceObservationRow[];
  now?: Date;
}): FakeDiscountAssessment {
  const flags: FakeDiscountFlag[] = [];
  const nowMs = (args.now ?? new Date()).getTime();
  const { baselines, referencePrices } = args;

  if (baselines.window90d.sampleCount < 3) {
    flags.push("insufficient_history");
  }

  const historicalMax90 =
    baselines.window90d.sampleCount > 0
      ? Math.max(
          ...args.observations
            .filter((row) => nowMs - parseTs(row.observed_at) <= 90 * MS_PER_DAY)
            .map((row) => row.observed_price)
        )
      : null;

  if (
    args.marketedOldPrice != null &&
    args.marketedOldPrice > 0 &&
    historicalMax90 != null &&
    args.marketedOldPrice > historicalMax90 * 1.12
  ) {
    flags.push("inflated_reference_price");
  }

  if (referencePrices.primaryReference != null && args.marketedOldPrice != null) {
    if (args.marketedOldPrice > referencePrices.primaryReference * 1.15 && args.currentPrice <= referencePrices.primaryReference) {
      flags.push("inflated_reference_price");
    }
  }

  const recent7 = args.observations.filter((row) => nowMs - parseTs(row.observed_at) <= 7 * MS_PER_DAY);
  const prior23 = args.observations.filter((row) => {
    const age = nowMs - parseTs(row.observed_at);
    return age > 7 * MS_PER_DAY && age <= 30 * MS_PER_DAY;
  });
  if (recent7.length >= 1 && prior23.length >= 2) {
    const recentMax = Math.max(...recent7.map((r) => r.observed_price));
    const priorMedian = prior23.map((r) => r.observed_price).sort((a, b) => a - b)[Math.floor(prior23.length / 2)]!;
    if (recentMax > priorMedian * 1.18 && args.currentPrice <= priorMedian * 1.05) {
      flags.push("temporary_markup_before_sale");
    }
  }

  const isFake = flags.includes("inflated_reference_price") || flags.includes("temporary_markup_before_sale");
  const confidence = Math.min(
    95,
    40 +
      (flags.includes("inflated_reference_price") ? 35 : 0) +
      (flags.includes("temporary_markup_before_sale") ? 30 : 0) +
      (flags.includes("insufficient_history") ? 15 : 0)
  );

  let reasoning = "Historical price trail supports the current ask relative to observed baselines.";
  if (flags.includes("inflated_reference_price")) {
    reasoning = "Marketed reference price exceeds observed historical highs — discount claim lacks evidence.";
  } else if (flags.includes("temporary_markup_before_sale")) {
    reasoning = "Recent price spike followed by reduction — possible artificial markdown pattern.";
  } else if (flags.includes("insufficient_history")) {
    reasoning = "Insufficient canonical SKU price history to verify discount claims.";
  }

  return { isFake, flags, confidence, reasoning };
}

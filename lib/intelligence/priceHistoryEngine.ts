/**
 * QuantAI price history engine — compact timeline + volatility from remembered snapshots.
 */

import type { MarketMemoryState } from "@/lib/intelligence/marketMemory";
import { computeHistoricalLowHigh, detectRecurringPriceCycles, getSnapshotsForLink } from "@/lib/intelligence/marketMemory";

export type PriceHistoryInsight = {
  sampleCount: number;
  recentLow: number | null;
  recentHigh: number | null;
  volatility01: number;
  trend: "down" | "flat" | "up" | "unknown";
  expectedFairBand: { low: number; high: number } | null;
  seasonalHint: string | null;
  compactTimelineSummary: string;
  recurringCycleNotes: string;
};

function stdDev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const v = nums.reduce((a, x) => a + (x - mean) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(v);
}

export function buildPriceHistoryInsight(
  link: string,
  currentPrice: number,
  memory: MarketMemoryState | null | undefined
): PriceHistoryInsight {
  const snaps = getSnapshotsForLink(memory, link);
  const range = computeHistoricalLowHigh(memory, link);
  const cycle = detectRecurringPriceCycles(memory, link);
  if (snaps.length < 2 || !range) {
    return {
      sampleCount: snaps.length,
      recentLow: snaps.length ? snaps[snaps.length - 1]!.price : null,
      recentHigh: snaps.length ? snaps[snaps.length - 1]!.price : null,
      volatility01: 0.35,
      trend: "unknown",
      expectedFairBand: null,
      seasonalHint: null,
      compactTimelineSummary: "No remembered multi-visit trail for this exact listing yet.",
      recurringCycleNotes: cycle.notes,
    };
  }

  const prices = snaps.map((s) => s.price);
  const vol = range.low > 0 ? stdDev(prices) / range.low : 0;
  const volatility01 = Math.min(1, vol / 0.18);

  const first = prices[0]!;
  const last = prices[prices.length - 1]!;
  let trend: PriceHistoryInsight["trend"] = "flat";
  if (last < first * 0.97) trend = "down";
  else if (last > first * 1.03) trend = "up";

  const pad = Math.max(8, Math.round(currentPrice * 0.035));
  const expectedFairBand = {
    low: Math.max(1, Math.round(range.low - pad)),
    high: Math.round(range.high + pad),
  };

  const spanMs = snaps.length >= 2 ? snaps[snaps.length - 1]!.ts - snaps[0]!.ts : 0;
  let seasonalHint: string | null = null;
  if (snaps.length >= 5 && spanMs > 45 * 86400000) {
    const m = new Date(snaps[snaps.length - 1]!.ts).getMonth();
    if (m === 10 || m === 11) seasonalHint = "Holiday-heavy window in your history—promo density often rises; still SKU-specific.";
    else if (m >= 5 && m <= 7) seasonalHint = "Summer-spanning history—discretionary categories sometimes ease between peaks.";
  }

  const nearLow = currentPrice <= range.low * 1.025;
  const compactTimelineSummary = nearLow
    ? `Remembered range for this link: low ~${Math.round(range.low)} across ${range.samples} samples—current ask hugs the floor.`
    : `Remembered range: ~${Math.round(range.low)}–${Math.round(range.high)} (${range.samples} samples)—current ask is mid/upper band.`;

  return {
    sampleCount: range.samples,
    recentLow: range.low,
    recentHigh: range.high,
    volatility01,
    trend,
    expectedFairBand,
    seasonalHint,
    compactTimelineSummary,
    recurringCycleNotes: cycle.notes,
  };
}

/** Rough next-band estimate from trend + volatility (not a forecast guarantee). */
export function estimateForwardPriceHint(current: number, insight: PriceHistoryInsight): string {
  if (!insight.expectedFairBand) return "";
  const { low, high } = insight.expectedFairBand;
  if (insight.trend === "down" && insight.volatility01 > 0.55) {
    return `If volatility stays high, re-search may surface asks closer to ~${low}–${Math.round((low + current) / 2)} before fees.`;
  }
  if (insight.trend === "flat" && insight.volatility01 < 0.35) {
    return `Pricing looks sticky in your history—large dips are less likely without SKU or store changes.`;
  }
  if (insight.trend === "up") {
    return `Your remembered trail drifts upward—waiting is not automatically rewarded; alerts beat hope.`;
  }
  return `Band check on memory: most remembered trades fell ~${low}–${high} versus this ask.`;
}

/** Phase 38 — commerce price history labels (Good Price, Historical Low, etc.). */
export {
  buildCommercePriceHistoryIntelligence,
  type CommercePriceHistoryIntelligence,
  type PriceHistoryLabel,
} from "@/lib/intelligence/commercePriceHistoryEngine";

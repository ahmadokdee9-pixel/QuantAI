import type { QuantProduct } from "@/lib/shoppingScore";

export type PriceFieldIntel = {
  percentile: number;
  median: number;
  min: number;
  max: number;
  vsMedianPct: number;
  anomaly: "none" | "deep_discount" | "premium_outlier" | "suspicious_low";
  oneLiner: string;
};

function sortedPrices(list: QuantProduct[]): number[] {
  return [...new Set(list.map((p) => p.price).filter((x) => x > 0))].sort((a, b) => a - b);
}

function percentileRank(price: number, sorted: number[]): number {
  if (sorted.length === 0) return 50;
  let below = 0;
  for (const x of sorted) {
    if (x < price) below++;
    else break;
  }
  return Math.round((below / Math.max(1, sorted.length - 1 || 1)) * 100);
}

/** Tray-relative price position + simple anomaly labels (no external price history). */
export function buildPriceFieldIntel(p: QuantProduct, list: QuantProduct[]): PriceFieldIntel {
  const sorted = sortedPrices(list);
  const n = sorted.length;
  const min = n ? sorted[0]! : p.price;
  const max = n ? sorted[n - 1]! : p.price;
  const median = n
    ? n % 2 === 1
      ? sorted[(n - 1) >> 1]!
      : (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2
    : p.price;
  const pct = percentileRank(p.price, sorted);
  const vsMed = median > 0 ? ((p.price - median) / median) * 100 : 0;

  let anomaly: PriceFieldIntel["anomaly"] = "none";
  if (n >= 4 && p.price <= min * 1.08 && min < median * 0.72) {
    anomaly = p.price < median * 0.55 ? "suspicious_low" : "deep_discount";
  } else if (n >= 3 && p.price >= max * 0.92 && p.price > median * 1.35) {
    anomaly = "premium_outlier";
  }

  const oneLiner =
    n <= 1
      ? "Single visible price point—no peer spread for percentile context."
      : pct <= 12
        ? `Price sits in the bottom ~${Math.max(5, 100 - pct)}% of this tray vs peers (€${min}–€${max}).`
        : pct >= 88
          ? `Price sits in the top ~${pct}% of this tray—often premium positioning or bundle variance.`
          : `Around median for this tray (~${Math.round(vsMed)}% vs tray median €${Math.round(median)}).`;

  return {
    percentile: pct,
    median,
    min,
    max,
    vsMedianPct: Math.round(vsMed),
    anomaly,
    oneLiner: oneLiner.slice(0, 220),
  };
}

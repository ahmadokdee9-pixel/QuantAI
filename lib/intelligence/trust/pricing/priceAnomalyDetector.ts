/**
 * Phase 5 — Price anomaly / manipulation spike detection.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { HistoricalPriceBaseline } from "./historicalPriceResolver";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export type PriceAnomalyVerdict = {
  anomalySpike01: number;
  unrealisticSale01: number;
  reasons: string[];
};

export function detectPriceAnomalies(
  product: QuantProduct,
  baseline: HistoricalPriceBaseline,
  trayMedian: number
): PriceAnomalyVerdict {
  const reasons: string[] = [];
  let anomalySpike01 = 0;
  let unrealisticSale01 = 0;

  if (baseline.baselinePrice != null && baseline.baselinePrice > 0) {
    const drop = 1 - product.price / baseline.baselinePrice;
    if (drop > 0.55) {
      anomalySpike01 = clamp01(drop);
      reasons.push("sharp_drop_vs_historical_baseline");
    } else if (drop > 0.35) {
      anomalySpike01 = clamp01(drop * 0.8);
      reasons.push("moderate_drop_vs_baseline");
    }
    const spike = product.price / baseline.baselinePrice;
    if (spike > 1.35) {
      anomalySpike01 = Math.max(anomalySpike01, clamp01(spike - 1));
      reasons.push("price_spike_above_baseline");
    }
  }

  if (trayMedian > 0 && product.price < trayMedian * 0.45) {
    unrealisticSale01 = clamp01(1 - product.price / trayMedian);
    reasons.push("price_far_below_tray_median");
  }

  if (product.oldPrice != null && product.price < product.oldPrice * 0.4) {
    unrealisticSale01 = Math.max(unrealisticSale01, 0.65);
    reasons.push("extreme_sale_depth");
  }

  return {
    anomalySpike01: round4(anomalySpike01),
    unrealisticSale01: round4(unrealisticSale01),
    reasons,
  };
}

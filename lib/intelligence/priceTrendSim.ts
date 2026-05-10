import type { QuantProduct } from "@/lib/shoppingScore";
import type { ListStats } from "./types";

export type TrendProjection = "softening" | "stable" | "pressure_up" | "volatile";

/**
 * Lightweight heuristic “simulation” of near-term price pressure from listing cues
 * (not historical market data — SerpAPI snapshot only).
 */
export function simulatePriceTrend(
  p: QuantProduct,
  stats: ListStats
): { projection: TrendProjection; note: string } {
  const median = stats.medianPrice > 0 ? stats.medianPrice : p.price;
  const vsMedian = median > 0 ? p.price / median : 1;
  const hasDiscount =
    p.oldPrice != null && p.oldPrice > p.price && (p.oldPrice - p.price) / p.oldPrice > 0.03;

  if (p.priceTrend === "down" && hasDiscount) {
    return {
      projection: "softening",
      note: "Listed under a reference price with an explicit markdown — short-term deal pressure looks favorable.",
    };
  }
  if (p.priceTrend === "up") {
    return {
      projection: "pressure_up",
      note: "Current ask is above the feed’s reference price — watch for retracement before committing.",
    };
  }
  if (vsMedian > 1.25 && !hasDiscount) {
    return {
      projection: "volatile",
      note: "Priced meaningfully above the median in this snapshot set — comparable listings may undercut this offer.",
    };
  }
  if (vsMedian < 0.88 && p.priceTrend === "stable") {
    return {
      projection: "softening",
      note: "Sits below the median for this search — relative value cushion if quality signals hold.",
    };
  }
  return {
    projection: "stable",
    note: "No strong directional cue from reference pricing in this snapshot — treat as stable until refreshed.",
  };
}

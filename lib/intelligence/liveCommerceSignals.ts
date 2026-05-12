import type { QuantProduct } from "@/lib/shoppingScore";

/**
 * Future-ready live-commerce hooks (tray-only heuristics today; designed for feed/socket upgrades).
 * No UI contract — attach to `ProductDealIntelligence` as compact metadata.
 */
export type LiveSignalBand = "unknown" | "low" | "moderate" | "elevated";

export type LiveCommerceSignals = {
  /** Reserved: listing velocity vs peers — unknown until live feed. */
  dealVelocityBand: LiveSignalBand;
  /** 0–100 heuristic: trend + markdown coherence (placeholder weights). */
  suddenDropScore: number;
  /** Shelf / engine hint when rare markdown vs tray. */
  rareDiscountBand: LiveSignalBand;
  /** 0–3 from listing urgency language. */
  stockUrgencyTier: 0 | 1 | 2 | 3;
  /** 0–100: mirrors suspicious discount axis until cross-store feed exists. */
  crossRetailerAnomalyScore: number;
  /** Near tray floor + clean hygiene → moderate “historical low” read on snapshot. */
  historicalLowBand: LiveSignalBand;
  /** Reserved: rebound model — unknown offline. */
  priceReboundBand: LiveSignalBand;
  /** When true, a real-time price stream is attached (always false for now). */
  liveFeedAttached: boolean;
};

export type LiveCommerceSignalInput = {
  product: QuantProduct;
  hasDiscount: boolean;
  discountPct: number | null;
  suspiciousDiscountRisk: number;
  atTrayFloor: boolean;
  shelfHasRareDeal: boolean;
  urgency: "none" | "low" | "elevated";
};

export function buildLiveCommerceSignals(input: LiveCommerceSignalInput): LiveCommerceSignals {
  const { product, hasDiscount, discountPct, suspiciousDiscountRisk, atTrayFloor, shelfHasRareDeal, urgency } = input;
  const d = discountPct ?? 0;
  const trendBoost = product.priceTrend === "down" ? 22 : product.priceTrend === "up" ? -8 : 0;
  const suddenDropScore = Math.min(
    100,
    Math.max(0, Math.round(8 + trendBoost + (hasDiscount ? Math.min(28, d * 0.35) : 0) - suspiciousDiscountRisk * 0.12))
  );

  const stockUrgencyTier: LiveCommerceSignals["stockUrgencyTier"] =
    urgency === "elevated" ? 3 : urgency === "low" ? 2 : product.availability ? 1 : 0;

  return {
    dealVelocityBand: "unknown",
    suddenDropScore,
    rareDiscountBand: shelfHasRareDeal ? "moderate" : hasDiscount && d >= 18 ? "low" : "unknown",
    stockUrgencyTier,
    crossRetailerAnomalyScore: Math.min(100, Math.round(suspiciousDiscountRisk)),
    historicalLowBand: atTrayFloor && suspiciousDiscountRisk < 52 ? "moderate" : "unknown",
    priceReboundBand: "unknown",
    liveFeedAttached: false,
  };
}

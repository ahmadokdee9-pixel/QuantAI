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
  /** 0–100: composite “heat” from drop + stock + rare band + trust-adjusted discount. */
  dealHeat: number;
  /** 0–100: how confident the tray snapshot is about buy timing (inverse rebound + fake risk). */
  buyTimingConfidence: number;
  /** Compact tray-only price memory read for analysts (not an archival chart). */
  historicalPriceMemoryLabel: string;
  /** High-confidence rare opportunity — only when hygiene + floor + authenticity align. */
  rareOpportunity: boolean;
  /** 0–100 heuristic rebound / snap-back risk from trend + anchor hygiene. */
  reboundPricingRisk: number;
};

export type LiveCommerceSignalInput = {
  product: QuantProduct;
  hasDiscount: boolean;
  discountPct: number | null;
  suspiciousDiscountRisk: number;
  atTrayFloor: boolean;
  shelfHasRareDeal: boolean;
  urgency: "none" | "low" | "elevated";
  discountConfidence: number;
  discountAuthenticity: number;
  unusualUnderpricing: boolean;
};

export function buildLiveCommerceSignals(input: LiveCommerceSignalInput): LiveCommerceSignals {
  const {
    product,
    hasDiscount,
    discountPct,
    suspiciousDiscountRisk,
    atTrayFloor,
    shelfHasRareDeal,
    urgency,
    discountConfidence,
    discountAuthenticity,
    unusualUnderpricing,
  } = input;
  const d = discountPct ?? 0;
  const trendBoost = product.priceTrend === "down" ? 22 : product.priceTrend === "up" ? -8 : 0;
  const suddenDropScore = Math.min(
    100,
    Math.max(0, Math.round(8 + trendBoost + (hasDiscount ? Math.min(28, d * 0.35) : 0) - suspiciousDiscountRisk * 0.12))
  );

  const stockUrgencyTier: LiveCommerceSignals["stockUrgencyTier"] =
    urgency === "elevated" ? 3 : urgency === "low" ? 2 : product.availability ? 1 : 0;

  const stockMomentum = stockUrgencyTier * 10 + (urgency === "elevated" ? 18 : urgency === "low" ? 8 : 0);
  const rareBand: LiveCommerceSignals["rareDiscountBand"] = shelfHasRareDeal
    ? "elevated"
    : hasDiscount && d >= 18 && suspiciousDiscountRisk < 48
      ? "moderate"
      : hasDiscount && d >= 12
        ? "low"
        : "unknown";
  const rareLift = rareBand === "elevated" ? 26 : rareBand === "moderate" ? 14 : rareBand === "low" ? 6 : 0;

  const reboundPricingRisk = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (product.priceTrend === "up" ? 22 : 0) +
          suspiciousDiscountRisk * 0.38 +
          (product.oldPrice != null && product.oldPrice > product.price
            ? Math.min(28, ((product.oldPrice - product.price) / product.oldPrice) * 42)
            : 0) -
          (atTrayFloor ? 10 : 0)
      )
    )
  );

  const dealHeat = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        suddenDropScore * 0.42 +
          stockMomentum * 0.85 +
          rareLift +
          (unusualUnderpricing ? 14 : 0) +
          (hasDiscount ? Math.min(16, d * 0.22) : 0) -
          suspiciousDiscountRisk * 0.18
      )
    )
  );

  const buyTimingConfidence = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        discountConfidence * 0.28 +
          discountAuthenticity * 0.32 +
          (100 - reboundPricingRisk) * 0.22 +
          (atTrayFloor ? 12 : 4) -
          suspiciousDiscountRisk * 0.14 -
          (urgency === "elevated" ? 6 : 0)
      )
    )
  );

  const historicalLowBand: LiveCommerceSignals["historicalLowBand"] =
    atTrayFloor && suspiciousDiscountRisk < 52 ? "moderate" : "unknown";

  const historicalPriceMemoryLabel =
    historicalLowBand === "moderate"
      ? "Tray snapshot reads near visible floor — treat as soft historical low."
      : atTrayFloor
        ? "At tray floor on this snapshot — memory band neutral."
        : "Tray-only memory — no off-feed archive attached.";

  const priceReboundBand: LiveCommerceSignals["priceReboundBand"] =
    reboundPricingRisk >= 62 ? "elevated" : reboundPricingRisk >= 40 ? "moderate" : "low";

  const rareOpportunity =
    shelfHasRareDeal &&
    suspiciousDiscountRisk < 38 &&
    discountAuthenticity >= 62 &&
    discountConfidence >= 64 &&
    buyTimingConfidence >= 74;

  return {
    dealVelocityBand: "unknown",
    suddenDropScore,
    rareDiscountBand: rareBand,
    stockUrgencyTier,
    crossRetailerAnomalyScore: Math.min(100, Math.round(suspiciousDiscountRisk)),
    historicalLowBand,
    priceReboundBand,
    liveFeedAttached: false,
    dealHeat,
    buyTimingConfidence,
    historicalPriceMemoryLabel,
    rareOpportunity,
    reboundPricingRisk,
  };
}

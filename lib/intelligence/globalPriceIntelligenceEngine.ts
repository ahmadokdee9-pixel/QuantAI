/**
 * Phase 37 — Global Price Intelligence.
 * Tray-wide price positioning for every comparable offer.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { UnifiedCardInsight } from "@/lib/intelligence/unifiedMarketMatching";

export type GlobalPriceLabel =
  | "UNDERPRICED"
  | "FAIR PRICE"
  | "OVERPRICED"
  | "RARE DEAL"
  | "STRONG DEAL"
  | "BEST PRICE FOUND";

export type GlobalPriceIntelligence = {
  version: 1;
  lowestPriceFound: number;
  medianMarketPrice: number;
  highestMarketPrice: number;
  priceAdvantagePct: number;
  pricePositionPct: number;
  priceFairnessScore: number;
  priceOpportunityScore: number;
  priceLabel: GlobalPriceLabel;
  priceReasoning: string;
};

function median(nums: number[]): number {
  const s = nums.filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Build global price intelligence for one product inside tray universe. */
export function buildGlobalPriceIntelligence(args: {
  product: QuantProduct;
  tray: QuantProduct[];
  marketInsight?: UnifiedCardInsight | null;
}): GlobalPriceIntelligence {
  const { product, tray, marketInsight } = args;
  const comparable = tray.filter((p) => p.price > 0);
  const prices = comparable.map((p) => p.price);
  const lowestPriceFound = Math.min(...prices, product.price);
  const highestMarketPrice = Math.max(...prices, product.price);
  const medianMarketPrice = marketInsight?.averageMarketPrice ?? median(prices);

  const priceAdvantagePct =
    medianMarketPrice > 0 && product.price > 0
      ? Math.round(((medianMarketPrice - product.price) / medianMarketPrice) * 100)
      : 0;

  const spread = highestMarketPrice - lowestPriceFound;
  const pricePositionPct =
    spread > 0 && product.price > 0
      ? Math.round(((highestMarketPrice - product.price) / spread) * 100)
      : 50;

  let priceFairnessScore = 50;
  if (priceAdvantagePct > 0) priceFairnessScore += Math.min(30, priceAdvantagePct * 0.8);
  if (priceAdvantagePct < 0) priceFairnessScore += Math.max(-28, priceAdvantagePct * 0.9);
  if (marketInsight?.isBestTrustedInFamily) priceFairnessScore += 12;
  priceFairnessScore = clamp(Math.round(priceFairnessScore), 0, 100);

  let priceOpportunityScore = clamp(Math.round(45 + priceAdvantagePct * 0.7 + pricePositionPct * 0.15), 0, 100);
  if (marketInsight?.sameItemCheaper && marketInsight.sameItemCheaper.link !== product.link) {
    priceOpportunityScore = clamp(priceOpportunityScore - 15, 0, 100);
  }

  let priceLabel: GlobalPriceLabel = "FAIR PRICE";
  if (product.link === marketInsight?.bestTrustedLink || product.price === lowestPriceFound) {
    priceLabel = "BEST PRICE FOUND";
  } else if (priceAdvantagePct >= 18) {
    priceLabel = "STRONG DEAL";
  } else if (priceAdvantagePct >= 10 && (product.rating as number) >= 4.5) {
    priceLabel = "RARE DEAL";
  } else if (priceAdvantagePct >= 6) {
    priceLabel = "UNDERPRICED";
  } else if (priceAdvantagePct <= -12 || marketInsight?.overpricedVsFair) {
    priceLabel = "OVERPRICED";
  }

  let priceReasoning = `Priced at €${product.price} against tray median €${Math.round(medianMarketPrice)}.`;
  if (priceLabel === "BEST PRICE FOUND") {
    priceReasoning = `Market sample lowest observed at €${product.price} — lowest among listings in this search sample.`;
  } else if (priceLabel === "STRONG DEAL" || priceLabel === "RARE DEAL") {
    priceReasoning = `${priceAdvantagePct}% below median market price (€${Math.round(medianMarketPrice)}) — strong purchase value.`;
  } else if (priceLabel === "UNDERPRICED") {
    priceReasoning = `Underpriced vs tray median by ${priceAdvantagePct}% — favorable market position.`;
  } else if (priceLabel === "OVERPRICED") {
    priceReasoning = `Priced ${Math.abs(priceAdvantagePct)}% above tray median without clear spec advantage.`;
  }

  return {
    version: 1,
    lowestPriceFound,
    medianMarketPrice: Math.round(medianMarketPrice),
    highestMarketPrice,
    priceAdvantagePct,
    pricePositionPct,
    priceFairnessScore,
    priceOpportunityScore,
    priceLabel,
    priceReasoning,
  };
}

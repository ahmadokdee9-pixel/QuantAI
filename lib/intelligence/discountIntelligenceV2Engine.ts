/**
 * Phase 37 — Discount Intelligence V2.
 * Real vs fake discount detection with competitor and category context.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { detectFakeDiscountSignals } from "@/lib/intelligence/fakeDiscountDetector";
import type { DiscountOpportunityInsight } from "@/lib/intelligence/discountOpportunityEngine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";

export type DiscountV2Label =
  | "BEST DEAL FOUND"
  | "STRONG DISCOUNT"
  | "GOOD DEAL"
  | "FAIR PRICE"
  | "WEAK DEAL"
  | "OVERPRICED";

export type DiscountIntelligenceV2 = {
  version: 2;
  discountScore: number;
  discountStrength: number;
  discountTrust: number;
  discountOpportunity: number;
  discountReasoning: string;
  discountLabel: DiscountV2Label;
  realDiscount: boolean;
  fakeDiscount: boolean;
  inflatedDiscount: boolean;
  historicalDiscount: boolean;
  competitorDiscount: boolean;
  categoryDiscount: boolean;
  visibleDiscountPct: number | null;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function visibleDiscountPct(product: QuantProduct): number | null {
  if (product.oldPrice == null || product.oldPrice <= product.price || product.price <= 0) return null;
  return Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
}

/** Build discount intelligence v2 for one listing. */
export function buildDiscountIntelligenceV2(args: {
  product: QuantProduct;
  tray: QuantProduct[];
  phase36Discount?: DiscountOpportunityInsight;
  globalPrice?: GlobalPriceIntelligence;
}): DiscountIntelligenceV2 {
  const { product, tray, phase36Discount, globalPrice } = args;
  const visible = visibleDiscountPct(product);
  const fakeSignals = detectFakeDiscountSignals(product, tray);

  const realDiscount = visible != null && visible >= 8 && fakeSignals.fakeDiscountProbability < 0.45;
  const fakeDiscount = fakeSignals.fakeDiscountProbability >= 0.62;
  const inflatedDiscount = fakeSignals.discountManipulationRisk >= 0.55;
  const historicalDiscount = visible != null && visible >= 15 && product.priceTrend === "down";
  const competitorDiscount = phase36Discount?.sameProductCheaperElsewhere ?? false;
  const categoryDiscount = (globalPrice?.priceAdvantagePct ?? 0) >= 10;

  let discountScore = phase36Discount?.discountScore ?? 42;
  if (realDiscount) discountScore += 14;
  if (fakeDiscount) discountScore -= 22;
  if (inflatedDiscount) discountScore -= 12;
  if (categoryDiscount) discountScore += 8;
  if (competitorDiscount) discountScore -= 10;

  const discountStrength = clamp(
    Math.round((visible ?? 0) * 1.2 + (globalPrice?.priceAdvantagePct ?? 0) * 0.6),
    0,
    100
  );
  const discountTrust = clamp(Math.round(100 - fakeSignals.fakeDiscountProbability * 100), 0, 100);
  const discountOpportunity = clamp(
    Math.round(discountScore * 0.45 + discountStrength * 0.35 + discountTrust * 0.2),
    0,
    100
  );

  let discountLabel: DiscountV2Label = "FAIR PRICE";
  if (globalPrice?.priceLabel === "BEST PRICE FOUND" && discountOpportunity >= 70) {
    discountLabel = "BEST DEAL FOUND";
  } else if (realDiscount && visible != null && visible >= 20) {
    discountLabel = "STRONG DISCOUNT";
  } else if (realDiscount || categoryDiscount) {
    discountLabel = "GOOD DEAL";
  } else if (globalPrice?.priceLabel === "OVERPRICED" || fakeDiscount) {
    discountLabel = fakeDiscount ? "WEAK DEAL" : "OVERPRICED";
  } else if (visible != null && visible < 5 && (globalPrice?.priceAdvantagePct ?? 0) < 0) {
    discountLabel = "WEAK DEAL";
  }

  let discountReasoning = "No strong markdown signal — value may come from fair market pricing instead.";
  if (discountLabel === "BEST DEAL FOUND") {
    discountReasoning = "Best deal found in this search universe — strongest price plus trustworthy discount context.";
  } else if (discountLabel === "STRONG DISCOUNT") {
    discountReasoning = visible != null
      ? `Verified ${visible}% discount with low manipulation risk.`
      : "Strong discount with acceptable trust signals.";
  } else if (discountLabel === "GOOD DEAL") {
    discountReasoning = competitorDiscount
      ? "Good deal on this listing, but verify same product pricing at competing merchants."
      : "Good deal relative to category tray pricing.";
  } else if (discountLabel === "WEAK DEAL") {
    discountReasoning = inflatedDiscount
      ? "Discount badge looks inflated versus peer market pricing."
      : "Weak deal — markdown is small or unreliable.";
  } else if (discountLabel === "OVERPRICED") {
    discountReasoning = "Listing price sits above market without compensating discount or quality lead.";
  } else if ((globalPrice?.priceAdvantagePct ?? 0) > 0) {
    discountReasoning = `Fair price with ${globalPrice!.priceAdvantagePct}% advantage vs tray median — value can still justify buying.`;
  }

  return {
    version: 2,
    discountScore: clamp(Math.round(discountScore), 0, 100),
    discountStrength,
    discountTrust,
    discountOpportunity,
    discountReasoning,
    discountLabel,
    realDiscount,
    fakeDiscount,
    inflatedDiscount,
    historicalDiscount,
    competitorDiscount,
    categoryDiscount,
    visibleDiscountPct: visible,
  };
}

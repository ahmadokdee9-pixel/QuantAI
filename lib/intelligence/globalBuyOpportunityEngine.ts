/**
 * Phase 37 — Global Buy Opportunity Engine.
 * Value-based purchase opportunity — discount not required for BUY READY.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { DiscountIntelligenceV2 } from "@/lib/intelligence/discountIntelligenceV2Engine";
import type { GlobalAlternatives } from "@/lib/intelligence/globalAlternativeEngine";
import type { GlobalPriceIntelligence } from "@/lib/intelligence/globalPriceIntelligenceEngine";
import type { UniversalProductDecision } from "@/lib/ui/universalProductDecision";

export type GlobalBuyOpportunity = {
  version: 1;
  buyOpportunityScore: number;
  buyNowEligible: boolean;
  bestDealFound: boolean;
  valueLedBuy: boolean;
  qualityScore: number;
  sellerScore: number;
  availabilityScore: number;
  valueScore: number;
  buyReasoning: string;
  waitReasoning: string;
  avoidReasoning: string;
};

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/** Compute global buy opportunity — value itself can trigger BUY READY. */
export function computeGlobalBuyOpportunity(args: {
  product: QuantProduct;
  decision: UniversalProductDecision;
  globalPrice: GlobalPriceIntelligence;
  discountV2: DiscountIntelligenceV2;
  alternatives: GlobalAlternatives;
}): GlobalBuyOpportunity {
  const { product, decision, globalPrice, discountV2, alternatives } = args;
  const intel = decision.productIntelligence;

  const ratingScore = Math.round(((product.rating as number) || 4) * 20);
  const qualityScore = Math.max(intel?.productQualityScore ?? 0, ratingScore);
  const sellerScore = intel?.merchantTrustScore ?? intel?.trustScore ?? 50;
  const availabilityScore =
    /in stock|available|ships|delivery|free delivery/i.test(`${product.availability ?? ""} ${product.shipping ?? ""}`)
      ? 82
      : 58;

  const valueScore = clamp(
    Math.round(
      globalPrice.priceFairnessScore * 0.35 +
        globalPrice.priceOpportunityScore * 0.25 +
        qualityScore * 0.2 +
        sellerScore * 0.12 +
        availabilityScore * 0.08
    ),
    0,
    100
  );

  let buyOpportunityScore = valueScore;
  if (globalPrice.priceLabel === "BEST PRICE FOUND") buyOpportunityScore += 10;
  if (globalPrice.priceAdvantagePct >= 8) buyOpportunityScore += 8;
  if (discountV2.discountLabel === "BEST DEAL FOUND") buyOpportunityScore += 12;
  if (discountV2.realDiscount) buyOpportunityScore += 6;
  if (discountV2.fakeDiscount) buyOpportunityScore -= 14;
  if (alternatives.bestSameProductCheaper && alternatives.bestSameProductCheaper.link !== product.link) {
    buyOpportunityScore -= 10;
  }
  buyOpportunityScore = clamp(Math.round(buyOpportunityScore), 0, 100);

  const valueLedBuy =
    buyOpportunityScore >= 66 &&
    globalPrice.priceAdvantagePct >= 4 &&
    qualityScore >= 72 &&
    sellerScore >= 58 &&
    globalPrice.priceFairnessScore >= 55;

  const bestDealFound =
    globalPrice.priceLabel === "BEST PRICE FOUND" ||
    discountV2.discountLabel === "BEST DEAL FOUND" ||
    (globalPrice.priceAdvantagePct >= 12 && sellerScore >= 65);

  const buyNowEligible =
    buyOpportunityScore >= 68 &&
    sellerScore >= 55 &&
    qualityScore >= 55 &&
    !discountV2.fakeDiscount;

  let buyReasoning = "";
  if (valueLedBuy || buyNowEligible) {
    buyReasoning = `Excellent value at €${product.price} vs search-sample median €${globalPrice.medianMarketPrice}. Strong quality and seller trust signal support buying now${discountV2.realDiscount ? " with discount signal" : " even without a huge markdown"}.`;
  }

  const waitReasoning =
    alternatives.bestSameProductCheaper
      ? `Wait only if you can buy the same product for €${alternatives.bestSameProductCheaper.price} at ${alternatives.bestSameProductCheaper.store}.`
      : globalPrice.priceLabel === "OVERPRICED"
        ? "Wait for a price drop — this listing sits above fair market."
        : "Wait if you need a stronger discount or better availability.";

  const avoidReasoning =
    discountV2.fakeDiscount || sellerScore < 40
      ? "Avoid — discount trust or seller trust is too weak for checkout."
      : "Avoid — competing listings deliver better price, trust, or product fit.";

  return {
    version: 1,
    buyOpportunityScore,
    buyNowEligible,
    bestDealFound,
    valueLedBuy,
    qualityScore,
    sellerScore,
    availabilityScore,
    valueScore,
    buyReasoning,
    waitReasoning,
    avoidReasoning,
  };
}

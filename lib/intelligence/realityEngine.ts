/**
 * QuantAI Reality & Trust Intelligence v1 — hidden tray-local realism composite.
 * Composes fake-discount, emotional-trap, and retailer-integrity signals into `realityScore`.
 */

import { isSpammyListingTitle, listingTextQuality01 } from "@/lib/commerce/listingQuality";
import type { QuantProduct } from "@/lib/shoppingScore";
import { ratingValue } from "@/lib/shoppingScore";
import { detectEmotionalBuyingSignals } from "./emotionalBuyingSignals";
import { detectFakeDiscountSignals } from "./fakeDiscountDetector";
import { computeTrustIntegrityProfile } from "./trustIntegrityEngine";
import type { QuantAIRealityTrustLayer, RealityBand } from "./realityTrustTypes";

export type { QuantAIRealityTrustLayer, RealityBand } from "./realityTrustTypes";

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function bandFromScore(s: number): RealityBand {
  if (s >= 90) return "highly_realistic";
  if (s >= 70) return "acceptable";
  if (s >= 50) return "caution";
  return "suspicious";
}

export function buildQuantAIRealityTrustLayer(
  p: QuantProduct,
  list: QuantProduct[],
  ctx: { medianPrice: number; searchQuery: string }
): QuantAIRealityTrustLayer {
  const fake = detectFakeDiscountSignals(p, list);
  const emotional = detectEmotionalBuyingSignals(p, ctx.searchQuery);
  const integrity = computeTrustIntegrityProfile(p);

  const med = ctx.medianPrice > 0 ? ctx.medianPrice : p.price;
  const price = p.price > 0 ? p.price : med;
  const priceVsMed = med > 0 ? price / med : 1;
  const priceDeviationStress = Math.abs(1 - priceVsMed);

  const lq = listingTextQuality01(p.title);
  const spamPenalty = isSpammyListingTitle(p.title) ? 0.32 : 0;
  const rt = ratingValue(p.rating);
  const listingSpecGap01 = clamp01(
    (1 - lq) * 0.55 + (p.title.trim().length < 16 ? 0.28 : 0) + (rt <= 0 ? 0.22 : rt < 3.9 ? 0.12 : 0)
  );

  let imageTitleMismatchRisk = 0.12;
  if (priceVsMed < 0.62 && /\b(sku|item\s*#|model\s*#|asin|upc|mpn)\b/i.test(p.title)) imageTitleMismatchRisk += 0.38;
  if (priceVsMed < 0.55 && p.title.length > 110) imageTitleMismatchRisk += 0.12;
  imageTitleMismatchRisk = clamp01(imageTitleMismatchRisk);

  const stockVolatility01 = clamp01(
    (p.priceTrend === "down" ? 0.2 : p.priceTrend === "up" ? 0.14 : 0.08) +
      fake.urgencyManipulationRisk * 0.38 +
      (1 - integrity.retailerReliability01) * 0.18
  );

  let tooGoodToBeTrue01 = 0.1;
  if (priceVsMed < 0.48 && integrity.retailerReliability01 < 0.62) tooGoodToBeTrue01 = 0.74;
  else if (priceVsMed < 0.58 && fake.fakeDiscountProbability > 0.44) tooGoodToBeTrue01 = 0.52;
  else if (priceVsMed < 0.65 && fake.discountManipulationRisk > 0.55) tooGoodToBeTrue01 = 0.38;
  tooGoodToBeTrue01 = clamp01(tooGoodToBeTrue01);

  let s = 88;
  s -= fake.fakeDiscountProbability * 24;
  s -= fake.discountManipulationRisk * 20;
  s -= fake.urgencyManipulationRisk * 8;
  s -= emotional.emotionalTrapScore * 15;
  s -= (1 - integrity.retailerReliability01) * 19;
  s -= spamPenalty * 22;
  s -= (1 - lq) * 11;
  s -= listingSpecGap01 * 9;
  s -= stockVolatility01 * 7;
  s -= imageTitleMismatchRisk * 10;
  s -= tooGoodToBeTrue01 * 17;
  s -= priceDeviationStress * (priceVsMed > 1.42 ? 5.5 : priceVsMed < 0.42 ? 7.2 : 2.4);
  s += integrity.retailerReliability01 * 5.5;

  const realityScore = Math.round(Math.min(100, Math.max(0, s)));

  return {
    realityScore,
    realityBand: bandFromScore(realityScore),
    fakeDiscountProbability: fake.fakeDiscountProbability,
    discountManipulationRisk: fake.discountManipulationRisk,
    urgencyManipulationRisk: fake.urgencyManipulationRisk,
    emotionalTrapScore: emotional.emotionalTrapScore,
    retailerReliability01: integrity.retailerReliability01,
    marketplaceRisk01: integrity.marketplaceRisk01,
    weakRetailer: integrity.weakRetailer,
    listingSpecGap01,
    imageTitleMismatchRisk,
    stockVolatility01,
    tooGoodToBeTrue01,
  };
}

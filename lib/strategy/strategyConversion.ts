/**
 * P5.7 — Conversion-quality scoring (deterministic).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";
import type { MarketPositioning } from "@/lib/strategy/strategyMarket";

export type ConversionQuality = {
  conversionConfidence: number;
  trustToConversion: number;
  productAttractiveness: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function evaluateConversionQuality(args: {
  products: QuantProduct[];
  market: MarketPositioning;
}): ConversionQuality {
  const { products, market } = args;
  const top = products.slice(0, 5);
  const trustScores = top.map((p) => getStoreTrustScore(p.store) / 100);
  const avgTrust = trustScores.length ? trustScores.reduce((s, t) => s + t, 0) / trustScores.length : 0.5;
  const ratings = top.map((p) => (typeof p.rating === "number" ? p.rating / 5 : 0.8));
  const avgRating = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0.5;

  const trustToConversion = clamp(avgTrust * 0.7 + avgRating * 0.3, 0, 1);
  const productAttractiveness = clamp(trustToConversion * 0.6 + market.marketPositionScore * 0.4, 0, 1);
  const conversionConfidence = clamp(
    productAttractiveness * 0.5 + trustToConversion * 0.35 + market.categoryFocus * 0.15,
    0,
    1
  );

  return {
    conversionConfidence: Math.round(conversionConfidence * 1000) / 1000,
    trustToConversion: Math.round(trustToConversion * 1000) / 1000,
    productAttractiveness: Math.round(productAttractiveness * 1000) / 1000,
  };
}

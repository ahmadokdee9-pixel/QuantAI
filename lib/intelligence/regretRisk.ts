/**
 * Regret-risk heuristics — long-term satisfaction vs hype / overpay / weak proof.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import type { ListStats, ProductCategorySlug } from "./types";
import type { QuantAIRealityTrustLayer } from "./realityTrustTypes";

export type RegretRiskLevel = "LOW" | "MODERATE" | "HIGH";

export type RegretRiskAxes = {
  overpay01: number;
  hype01: number;
  trendExpiration01: number;
  durabilityConcern01: number;
  resaleWeak01: number;
  emotionalOverspend01: number;
};

export type RegretRiskAssessment = {
  level: RegretRiskLevel;
  axes: RegretRiskAxes;
  /** Small additive nudge to qiComposite (typically negative for HIGH). */
  compositeNudge: number;
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function fakeLow(rt: QuantAIRealityTrustLayer): boolean {
  return (rt.fakeDiscountProbability ?? 1) < 0.38;
}

export function assessRegretRisk(args: {
  product: QuantProduct;
  list: QuantProduct[];
  stats: ListStats;
  category: ProductCategorySlug;
  searchQuery: string;
  reality?: QuantAIRealityTrustLayer;
}): RegretRiskAssessment {
  const { product: p, list, stats, category, searchQuery, reality } = args;
  const q = searchQuery.toLowerCase();
  const trust = getStoreTrustScore(p.store);
  const stars = ratingValue(p.rating);
  const reviews = p.reviewsCount ?? 0;
  const med = stats.medianPrice > 0 ? stats.medianPrice : p.price;
  const priceVsMed = med > 0 && p.price > 0 ? p.price / med : 1;

  let disc = 0;
  if (p.oldPrice != null && p.oldPrice > p.price && p.price > 0) {
    disc = (p.oldPrice - p.price) / p.oldPrice;
  }

  const overpay01 = clamp01(
    (priceVsMed > 1.22 ? 0.55 : priceVsMed > 1.08 ? 0.28 : 0.08) +
      (trust < 58 && priceVsMed > 1.05 ? 0.22 : 0)
  );

  const hype01 = clamp01(
    (disc >= 0.45 && trust < 72 ? 0.42 : 0.12) +
      (/\b(hype|viral|tiktok|trending)\b/i.test(q) ? 0.25 : 0) +
      (reality?.fakeDiscountProbability ?? 0) * 0.35
  );

  const trendExpiration01 = clamp01(
    (category === "fashion" && disc > 0.35 ? 0.28 : 0.08) +
      (category === "electronics" && p.priceTrend === "down" ? 0.18 : 0) +
      (p.priceTrend === "down" ? 0.12 : 0)
  );

  const durabilityConcern01 = clamp01(
    (trust < 62 ? 0.28 : 0.1) +
      (reviews < 12 && stars < 4.2 ? 0.32 : 0) +
      (reality?.weakRetailer ? 0.22 : 0) +
      (category === "home" && trust < 68 ? 0.15 : 0)
  );

  const resaleWeak01 = clamp01(
    (category === "electronics" && priceVsMed > 1.12 ? 0.22 : 0.08) +
      (category === "beauty" ? 0.18 : 0) +
      (stars < 4.1 ? 0.12 : 0)
  );

  const emotionalOverspend01 = clamp01(
    (/\b(treat|splurge|luxury|designer)\b/i.test(q) && priceVsMed > 1.05 ? 0.35 : 0.1) +
      (reality?.emotionalTrapScore ?? 0) * 0.45
  );

  const axes: RegretRiskAxes = {
    overpay01,
    hype01,
    trendExpiration01,
    durabilityConcern01,
    resaleWeak01,
    emotionalOverspend01,
  };

  const peerReviews = list.map((x) => x.reviewsCount ?? 0);
  const maxR = Math.max(1, ...peerReviews);
  const depth01 = clamp01(Math.log10((reviews || 0) + 1) / Math.log10(maxR + 1));

  let score =
    overpay01 * 0.22 +
    hype01 * 0.18 +
    trendExpiration01 * 0.12 +
    durabilityConcern01 * 0.2 +
    resaleWeak01 * 0.1 +
    emotionalOverspend01 * 0.12 -
    depth01 * 0.14 -
    (stars >= 4.5 ? 0.1 : 0) -
    (trust >= 78 ? 0.12 : 0);

  if (reality?.realityScore != null && reality.realityScore >= 86 && trust >= 74 && fakeLow(reality)) {
    score -= 0.18;
  }

  score = clamp01(score);

  let level: RegretRiskLevel = "MODERATE";
  if (score < 0.36) level = "LOW";
  else if (score > 0.62) level = "HIGH";

  let compositeNudge = 0;
  if (level === "HIGH") compositeNudge = -2.6;
  else if (level === "MODERATE") compositeNudge = -0.85;
  else compositeNudge = 0.55;

  if (level === "LOW" && trust < 52) {
    level = "MODERATE";
    compositeNudge = -0.9;
  }

  return { level, axes, compositeNudge };
}

/**
 * Phase 3 — Recommendation classification: Best Overall / Value / Budget / Premium.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { getFinalComposite, getStoreTrustScore, ratingValue } from "@/lib/shoppingScore";
import type { DiscountIntelligenceResult } from "@/lib/intelligence/discountIntelligenceLayer";
import type { ExtractedSearchIntent } from "@/lib/search/intentExtractionEngine";
import {
  isSpecialtyPurchaseIntent,
  scoreSpecialtyListing,
} from "@/lib/search/specialtyRankingIntelligence";

export type RecommendationClass = "best_overall" | "best_value" | "best_budget" | "best_premium";

export type ClassifiedRecommendation = {
  class: RecommendationClass;
  label: string;
  link: string;
  store: string;
  title: string;
  price: number;
  trustScore: number;
  confidence: number;
  reasons: string[];
};

export type ComparisonIntelligenceResult = {
  bestOverall: ClassifiedRecommendation | null;
  bestValue: ClassifiedRecommendation | null;
  bestBudget: ClassifiedRecommendation | null;
  bestPremium: ClassifiedRecommendation | null;
  classifications: ClassifiedRecommendation[];
};

function median(nums: number[]): number {
  const s = [...nums].filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function toRec(
  p: QuantProduct,
  cls: RecommendationClass,
  label: string,
  confidence: number,
  reasons: string[]
): ClassifiedRecommendation {
  return {
    class: cls,
    label,
    link: p.link,
    store: p.store,
    title: p.title,
    price: p.price,
    trustScore: getStoreTrustScore(p.store),
    confidence,
    reasons,
  };
}

/** Auto-classify top tray picks by trust, value, budget, premium axes. */
export function buildComparisonIntelligence(
  products: QuantProduct[],
  intent: ExtractedSearchIntent,
  discount: DiscountIntelligenceResult,
  query?: string
): ComparisonIntelligenceResult {
  if (!products.length) {
    return { bestOverall: null, bestValue: null, bestBudget: null, bestPremium: null, classifications: [] };
  }

  const priced = products.filter((p) => p.price > 0);
  const med = median(priced.map((p) => p.price));

  const q = query ?? "";
  const specialtyMode = q.length > 0 && isSpecialtyPurchaseIntent(intent, q);
  const overall = specialtyMode
    ? [...products].sort((a, b) => {
        const sa = scoreSpecialtyListing(a.title, a.store, intent, q);
        const sb = scoreSpecialtyListing(b.title, b.store, intent, q);
        const delta =
          sb.specialtyScore + sb.totalAdjustment - (sa.specialtyScore + sa.totalAdjustment);
        if (Math.abs(delta) > 1) return delta;
        return getFinalComposite(b, products) - getFinalComposite(a, products);
      })[0]!
    : [...products].sort((a, b) => getFinalComposite(b, products) - getFinalComposite(a, products))[0]!;
  const overallConf = Math.min(96, Math.round(getFinalComposite(overall, products)));
  const overallReasons = [
    specialtyMode
      ? "Top specialty-intent match for this query"
      : "Strong composite score across trust and relevance",
    getStoreTrustScore(overall.store) >= 75 ? "Verified retailer trust" : "Acceptable seller trust",
  ];
  if (specialtyMode) {
    const sig = scoreSpecialtyListing(overall.title, overall.store, intent, q);
    overallReasons.push(...sig.reasons.slice(0, 2));
  }
  if (discount.bestVerifiedDiscount?.link === overall.link) {
    overallReasons.push("Best verified discount in tray");
  }
  const bestOverall = toRec(overall, "best_overall", "Best Overall", overallConf, overallReasons);

  const valuePool = priced.filter((p) => getStoreTrustScore(p.store) >= 66 && ratingValue(p.rating) >= 3.8);
  const bestValueProduct =
    valuePool.sort((a, b) => {
      const valueA = med > 0 && a.price > 0 ? med / a.price : 0;
      const valueB = med > 0 && b.price > 0 ? med / b.price : 0;
      return valueB * getStoreTrustScore(b.store) - valueA * getStoreTrustScore(a.store);
    })[0] ?? overall;
  const bestValue = toRec(
    bestValueProduct,
    "best_value",
    "Best Value",
    Math.min(92, overallConf - 4),
    ["Strong value-to-price ratio", "Trusted seller with solid reviews"]
  );

  const budgetPool = priced.filter((p) => {
    if (intent.budgetConstraints.maxPrice != null && p.price > intent.budgetConstraints.maxPrice * 1.05) return false;
    return getStoreTrustScore(p.store) >= 58;
  });
  const bestBudgetProduct = budgetPool.sort((a, b) => a.price - b.price)[0] ?? bestValueProduct;
  const bestBudget = toRec(
    bestBudgetProduct,
    "best_budget",
    "Best Budget",
    Math.min(88, overallConf - 8),
    intent.budgetConstraints.maxPrice
      ? [`Within ${intent.budgetConstraints.maxPrice} budget band`, "Lowest trusted price in tray"]
      : ["Lowest trusted price in tray", "Budget-conscious pick"]
  );

  const premiumPool = priced.filter(
    (p) => med > 0 && p.price >= med * 1.15 && getStoreTrustScore(p.store) >= 72
  );
  const bestPremiumProduct =
    premiumPool.sort((a, b) => getStoreTrustScore(b.store) - getStoreTrustScore(a.store))[0] ??
    priced.sort((a, b) => b.price - a.price)[0] ??
    overall;
  const bestPremium = toRec(
    bestPremiumProduct,
    "best_premium",
    "Best Premium",
    Math.min(90, overallConf - 2),
    ["Premium tier positioning", "High-trust retailer"]
  );

  return {
    bestOverall,
    bestValue,
    bestBudget,
    bestPremium,
    classifications: [bestOverall, bestValue, bestBudget, bestPremium],
  };
}

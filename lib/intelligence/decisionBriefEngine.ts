/**
 * Phase 3 — Decision brief: institutional buying recommendation from search intelligence.
 */

import type { ComparisonIntelligenceResult } from "@/lib/intelligence/recommendationClassification";
import type { DiscountIntelligenceResult } from "@/lib/intelligence/discountIntelligenceLayer";
import type { ExtractedSearchIntent } from "@/lib/search/intentExtractionEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";

export type DecisionBriefDTO = {
  headline: string;
  recommendation: {
    label: string;
    title: string;
    store: string;
    link: string;
    price: number | null;
  };
  why: string[];
  alternatives: Array<{ label: string; title: string; store: string; link: string }>;
  discountNote: string | null;
  confidence: number;
  sparseTrayWarning: string | null;
};

export function buildDecisionBrief(args: {
  query: string;
  products: QuantProduct[];
  intent: ExtractedSearchIntent;
  comparison: ComparisonIntelligenceResult;
  discount: DiscountIntelligenceResult;
  sparseTray: boolean;
}): DecisionBriefDTO | null {
  const { products, intent, comparison, discount, sparseTray } = args;
  if (!products.length) return null;

  const pick = comparison.bestOverall ?? comparison.bestValue;
  if (!pick) return null;

  const why: string[] = [...pick.reasons.slice(0, 4)];
  const trust = getStoreTrustScore(pick.store);
  if (trust >= 80) why.unshift("Highest trust score among top matches");
  if (intent.userGoal === "best_value" || intent.budgetConstraints.bestValue) {
    why.push("Aligned with best-value purchase intent");
  }
  if (intent.performanceIntent) {
    why.push(`Matched to ${intent.performanceIntent.replace(/_/g, " ")} intent`);
  }

  let discountNote: string | null = null;
  if (discount.bestVerifiedDiscount && discount.bestVerifiedDiscount.link === pick.link) {
    discountNote = `Best Verified Discount — save ~${Math.round(discount.bestVerifiedDiscount.savingsVsMedian)} vs tray median at ${discount.bestVerifiedDiscount.store}`;
  }

  const alternatives = [
    comparison.bestValue,
    comparison.bestBudget,
    comparison.bestPremium,
  ]
    .filter((c): c is NonNullable<typeof c> => c != null && c.link !== pick.link)
    .slice(0, 3)
    .map((c) => ({ label: c.label, title: c.title, store: c.store, link: c.link }));

  return {
    headline: "QuantAI Recommendation",
    recommendation: {
      label: pick.label,
      title: pick.title,
      store: pick.store,
      link: pick.link,
      price: pick.price > 0 ? pick.price : null,
    },
    why: why.slice(0, 6),
    alternatives,
    discountNote,
    confidence: pick.confidence,
    sparseTrayWarning: sparseTray
      ? "Limited listings in this scan — treat as directional and verify on retailer pages."
      : null,
  };
}

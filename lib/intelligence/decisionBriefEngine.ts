/**
 * Phase 3 — Decision brief: institutional buying recommendation from search intelligence.
 */

import type { ComparisonIntelligenceResult } from "@/lib/intelligence/recommendationClassification";
import type { DiscountIntelligenceResult } from "@/lib/intelligence/discountIntelligenceLayer";
import type { ExtractedSearchIntent } from "@/lib/search/intentExtractionEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";
import {
  isSpecialtyPurchaseIntent,
  pickSpecialtyLeaderIndex,
  scoreSpecialtyListing,
} from "@/lib/search/specialtyRankingIntelligence";

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
  /** Phase 10.1 — institutional explanation summary */
  explanationSummary?: string;
  /** Phase 10.1 — top user-facing reasons for the verdict */
  keyReasons?: string[];
  /** Phase 10.2 — institutional summary of tray alternatives */
  alternativesSummary?: string;
  /** Phase 10.3 — purchase timing and pricing context summary */
  marketContextSummary?: string;
  /** Phase 10.4 — why primary beats strongest alternatives */
  competitiveSummary?: string;
  competitiveAdvantages?: string[];
  tradeoffs?: string[];
  whyPrimaryWins?: string;
  /** Phase 10.5 — unified institutional confidence assessment */
  confidenceSummary?: string;
  confidenceTier?: string;
  confidenceDrivers?: string[];
  /** Phase 10.6 — intent alignment summary for primary recommendation */
  intentAlignmentSummary?: string;
  /** Phase 10.7 — personalization alignment summary */
  personalizationSummary?: string;
};

export function buildDecisionBrief(args: {
  query: string;
  products: QuantProduct[];
  intent: ExtractedSearchIntent;
  comparison: ComparisonIntelligenceResult;
  discount: DiscountIntelligenceResult;
  sparseTray: boolean;
}): DecisionBriefDTO | null {
  const { query, products, intent, comparison, discount, sparseTray } = args;
  if (!products.length) return null;

  const specialtyMode = isSpecialtyPurchaseIntent(intent, query);
  const leaderIdx = specialtyMode ? pickSpecialtyLeaderIndex(products, intent, query) : 0;
  const leader = products[leaderIdx]!;
  const comparisonPick = comparison.bestOverall ?? comparison.bestValue;

  const pick =
    specialtyMode && leader
      ? {
          label: "Best Overall",
          title: leader.title,
          store: leader.store,
          link: leader.link,
          price: leader.price,
          confidence: comparisonPick?.confidence ?? 78,
          reasons: scoreSpecialtyListing(leader.title, leader.store, intent, query).reasons,
        }
      : comparisonPick
        ? {
            label: comparisonPick.label,
            title: comparisonPick.title,
            store: comparisonPick.store,
            link: comparisonPick.link,
            price: comparisonPick.price,
            confidence: comparisonPick.confidence,
            reasons: comparisonPick.reasons,
          }
        : null;

  if (!pick) return null;

  const why: string[] = [...pick.reasons.slice(0, 4)];
  const trust = getStoreTrustScore(pick.store);
  if (trust >= 80) why.unshift("Highest trust score among top matches");
  if (intent.userGoal === "best_value" || intent.budgetConstraints.bestValue) {
    why.push("Aligned with best-value purchase intent");
  }
  if (intent.performanceIntent === "ai_training") {
    why.push("Recommended for AI/ML training workloads — modern CUDA architecture and high VRAM");
  } else if (intent.performanceIntent === "programming_work") {
    why.push("Optimised for programming productivity: IPS/QHD colour accuracy, USB-C connectivity");
  } else if (intent.performanceIntent) {
    why.push(`Matched to ${intent.performanceIntent.replace(/_/g, " ")} intent`);
  }
  if (intent.technicalRequirements.includes("tactile_switch")) {
    why.push("Tactile switch type aligned with stated preference");
  }
  if (specialtyMode && leaderIdx === 0) {
    why.unshift("Specialty-intent leader in tray ranking");
  } else if (specialtyMode && leaderIdx > 0) {
    why.unshift("Best specialty match after expert-category scoring");
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

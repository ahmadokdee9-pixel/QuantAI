/**
 * Phase 3 — Search intelligence upgrade orchestrator.
 * Applies intent, constraints, category protection, price sanity, trust-aware ranking.
 * No UI changes — meta + product order only.
 */

import { hardCategoryMismatch } from "@/lib/commerce/queryCategoryGuard";
import { buildDecisionBrief } from "@/lib/intelligence/decisionBriefEngine";
import { buildDiscountIntelligence, discountRankingNudge } from "@/lib/intelligence/discountIntelligenceLayer";
import { assessPriceSanity, isHardPriceSanityReject } from "@/lib/intelligence/priceSanityEngine";
import { buildComparisonIntelligence } from "@/lib/intelligence/recommendationClassification";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/shoppingScore";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import {
  assessConstraintViolations,
  extractSearchConstraints,
  totalConstraintPenalty,
} from "@/lib/search/constraintExtractionEngine";
import { extractSearchIntent } from "@/lib/search/intentExtractionEngine";
import { assessSparseResults } from "@/lib/search/sparseResultIntelligence";
import {
  isSpecialtyPurchaseIntent,
  scoreSpecialtyListing,
} from "@/lib/search/specialtyRankingIntelligence";

export type TrustRankingMeta = {
  applied: boolean;
  traySize: number;
  adjustments: Array<{
    store: string;
    trustScore: number;
    adjustment: number;
    specialtyScore?: number;
    weakListingPenalty?: number;
    hardReject: boolean;
  }>;
};

export type SearchIntelligenceUpgradeMeta = {
  version: "phase8-v1";
  extractedIntent: ReturnType<typeof extractSearchIntent>;
  constraints: ReturnType<typeof extractSearchConstraints>;
  trustRanking: TrustRankingMeta;
  decisionBrief: ReturnType<typeof buildDecisionBrief>;
  comparisonIntelligence: ReturnType<typeof buildComparisonIntelligence>;
  discountIntelligence: ReturnType<typeof buildDiscountIntelligence>;
  sparseResult: ReturnType<typeof assessSparseResults>;
  rankingAdjustmentsApplied: number;
};

function categoryProtectionPenalty(query: string, title: string): number {
  if (hardCategoryMismatch(query, title)) return 55;
  return 0;
}

/** Final intelligence pass: rerank products and compose institutional meta. */
export function applySearchIntelligenceUpgrade(
  products: QuantProduct[],
  query: string,
  canonicalQuery?: CanonicalQueryContract
): { products: QuantProduct[]; meta: SearchIntelligenceUpgradeMeta } {
  const intent = extractSearchIntent(query, canonicalQuery);
  const constraints = extractSearchConstraints(query, canonicalQuery);
  const trayPrices = products.map((p) => p.price).filter((n) => n > 0);
  const specialtyIntent = isSpecialtyPurchaseIntent(intent, query);

  const scored = products.map((p, index) => {
    const violations = assessConstraintViolations(p.title, p.price, constraints, intent);
    const constraintPen = totalConstraintPenalty(violations);
    const categoryPen = categoryProtectionPenalty(query, p.title);
    const priceSanity = assessPriceSanity(p, trayPrices, query);
    const pricePen = priceSanity.penalty;
    const specialty = scoreSpecialtyListing(p.title, p.store, intent, query);
    const trustAdj = specialty.trustAdjustment;
    const specialtyBoost = specialtyIntent ? specialty.totalAdjustment : specialty.trustAdjustment;
    const hardReject =
      categoryPen >= 50 ||
      violations.some((v) => v.severity === "hard" && v.penalty >= 35) ||
      isHardPriceSanityReject(priceSanity) ||
      (specialtyIntent && specialty.weakListingPenalty >= 22 && specialty.specialtyScore < 8);

    const base =
      (p.qiBuyingDecision?.confidence ?? p.qiComposite ?? 50) -
      constraintPen -
      categoryPen -
      pricePen +
      specialtyBoost;

    return {
      p,
      index,
      score: base,
      hardReject,
      trustAdj,
      specialtyBoost,
      specialtySignals: specialty,
    };
  });

  const survivors = scored.filter((x) => !x.hardReject);
  const pool = survivors.length >= Math.min(3, products.length) ? survivors : scored;

  const discountPreview = buildDiscountIntelligence(products, query);

  const sorted = pool
    .sort((a, b) => {
      if (specialtyIntent) {
        const specDelta =
          b.specialtySignals.specialtyScore +
          b.specialtySignals.totalAdjustment -
          (a.specialtySignals.specialtyScore + a.specialtySignals.totalAdjustment);
        if (Math.abs(specDelta) > 2) return specDelta;
      }
      const da = discountRankingNudge(a.p, discountPreview);
      const db = discountRankingNudge(b.p, discountPreview);
      const d = b.score + db - (a.score + da);
      if (Math.abs(d) > 0.01) return d;
      return a.index - b.index;
    })
    .map((x) => x.p);

  const ranked = sorted.map((p, i) => ({ ...p, qiRank: i }));
  const discountIntelligence = buildDiscountIntelligence(ranked, query);
  const comparisonIntelligence = buildComparisonIntelligence(ranked, intent, discountIntelligence, query);
  const sparseResult = assessSparseResults(query, ranked, intent, constraints, canonicalQuery);
  const decisionBrief = buildDecisionBrief({
    query,
    products: ranked,
    intent,
    comparison: comparisonIntelligence,
    discount: discountIntelligence,
    sparseTray: sparseResult.sparse,
  });

  const trustRanking: TrustRankingMeta = {
    applied: products.length > 0,
    traySize: products.length,
    adjustments: scored.slice(0, 12).map((s) => ({
      store: s.p.store,
      trustScore: getStoreTrustScore(s.p.store),
      adjustment: s.specialtyBoost,
      specialtyScore: s.specialtySignals.specialtyScore,
      weakListingPenalty: s.specialtySignals.weakListingPenalty,
      hardReject: s.hardReject,
    })),
  };

  return {
    products: ranked,
    meta: {
      version: "phase8-v1",
      extractedIntent: intent,
      constraints,
      trustRanking,
      decisionBrief,
      comparisonIntelligence,
      discountIntelligence,
      sparseResult,
      rankingAdjustmentsApplied: scored.filter(
        (s) =>
          s.hardReject ||
          s.score !== (s.p.qiBuyingDecision?.confidence ?? s.p.qiComposite ?? 50)
      ).length,
    },
  };
}

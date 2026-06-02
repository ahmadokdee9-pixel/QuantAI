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
import { getMarketplaceSellerRiskTier } from "@/lib/retailTrust";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import {
  assessConstraintViolations,
  extractSearchConstraints,
  totalConstraintPenalty,
} from "@/lib/search/constraintExtractionEngine";
import { extractSearchIntent } from "@/lib/search/intentExtractionEngine";
import { assessSparseResults } from "@/lib/search/sparseResultIntelligence";

export type TrustRankingMeta = {
  applied: boolean;
  traySize: number;
  adjustments: Array<{
    store: string;
    trustScore: number;
    adjustment: number;
    hardReject: boolean;
  }>;
};

export type SearchIntelligenceUpgradeMeta = {
  version: "phase3-v1";
  extractedIntent: ReturnType<typeof extractSearchIntent>;
  constraints: ReturnType<typeof extractSearchConstraints>;
  trustRanking: TrustRankingMeta;
  decisionBrief: ReturnType<typeof buildDecisionBrief>;
  comparisonIntelligence: ReturnType<typeof buildComparisonIntelligence>;
  discountIntelligence: ReturnType<typeof buildDiscountIntelligence>;
  sparseResult: ReturnType<typeof assessSparseResults>;
  rankingAdjustmentsApplied: number;
};

function runningShoeSpecialtyBoost(title: string, intent: ReturnType<typeof extractSearchIntent>): number {
  if (intent.productType !== "running_shoes" && intent.performanceIntent !== "stability_running") return 0;
  const text = title.toLowerCase();
  let boost = 0;
  if (/\b(stability|support|overpronation|motion\s+control|structured|guide|kayano|beast|adrenaline|ghost|pegasus)\b/i.test(text)) {
    boost += 10;
  }
  if (/\b(air\s+force|handball|spezial|3mc|dunk|samba|walking\s+shoe|lifestyle)\b/i.test(text) && !/\b(running|stability|support)\b/i.test(text)) {
    boost -= 14;
  }
  return boost;
}

function categoryProtectionPenalty(query: string, title: string): number {
  if (hardCategoryMismatch(query, title)) return 55;
  return 0;
}

function trustRankingAdjustment(store: string, title: string): number {
  const trust = getStoreTrustScore(store);
  const mp = getMarketplaceSellerRiskTier(store, title);
  let adj = 0;
  if (trust >= 82) adj += 4;
  else if (trust >= 72) adj += 2;
  else if (trust < 55) adj -= 8;
  else if (trust < 62) adj -= 4;
  if (mp === "high") adj -= 10;
  else if (mp === "medium") adj -= 3;
  if (/\b(made-in-china|wish\.|temu|aliexpress)\b/i.test(store)) adj -= 6;
  return adj;
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

  const scored = products.map((p, index) => {
    const violations = assessConstraintViolations(p.title, p.price, constraints, intent);
    const constraintPen = totalConstraintPenalty(violations);
    const categoryPen = categoryProtectionPenalty(query, p.title);
    const priceSanity = assessPriceSanity(p, trayPrices, query);
    const pricePen = priceSanity.penalty;
    const trustAdj = trustRankingAdjustment(p.store, p.title);
    const specialtyBoost = runningShoeSpecialtyBoost(p.title, intent);
    const hardReject =
      categoryPen >= 50 ||
      violations.some((v) => v.severity === "hard" && v.penalty >= 35) ||
      isHardPriceSanityReject(priceSanity);

    const base =
      (p.qiBuyingDecision?.confidence ?? p.qiComposite ?? 50) -
      constraintPen -
      categoryPen -
      pricePen +
      trustAdj +
      specialtyBoost;

    return { p, index, score: base, hardReject, trustAdj, specialtyBoost };
  });

  const survivors = scored.filter((x) => !x.hardReject);
  const pool = survivors.length >= Math.min(3, products.length) ? survivors : scored;

  const discountPreview = buildDiscountIntelligence(products, query);

  const sorted = pool
    .sort((a, b) => {
      const da = discountRankingNudge(a.p, discountPreview);
      const db = discountRankingNudge(b.p, discountPreview);
      const d = b.score + db - (a.score + da);
      if (Math.abs(d) > 0.01) return d;
      return a.index - b.index;
    })
    .map((x) => x.p);

  const ranked = sorted.map((p, i) => ({ ...p, qiRank: i }));
  const discountIntelligence = buildDiscountIntelligence(ranked, query);
  const comparisonIntelligence = buildComparisonIntelligence(ranked, intent, discountIntelligence);
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
      adjustment: s.trustAdj + s.specialtyBoost,
      hardReject: s.hardReject,
    })),
  };

  return {
    products: ranked,
    meta: {
      version: "phase3-v1",
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

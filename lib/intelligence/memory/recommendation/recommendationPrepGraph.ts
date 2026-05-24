/**
 * Phase 6 — Shadow-safe recommendation preparation (no live mutation).
 */

import type { CanonicalProductNode } from "@/lib/intelligence/identity/types";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { CanonicalUserTaste, RecommendationPrepNode } from "../types";

const MAX_CANDIDATES = 12;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function buildRecommendationPrepGraph(args: {
  canonicalProducts: CanonicalProductNode[];
  products: QuantProduct[];
  canonicalTaste: CanonicalUserTaste;
}): RecommendationPrepNode[] {
  const nodes: RecommendationPrepNode[] = [];
  const topCategories = Object.entries(args.canonicalTaste.categoryPreferences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  for (const node of args.canonicalProducts.slice(0, MAX_CANDIDATES)) {
    const offers = node.offers.map((o) => o.link);
    const related = args.canonicalProducts
      .filter((n) => n.commerceId !== node.commerceId)
      .slice(0, 3)
      .map((n) => n.commerceId);

    const sample = args.products.find((p) => p.link === offers[0]);
    const category = sample?.qiCategory ?? "general";
    const categoryMatch = topCategories.includes(category) ? 0.25 : 0;
    const premiumMatch = args.canonicalTaste.premiumIntent.premiumPreference01 * 0.2;
    const similarityPrepScore = round4(clamp01(0.45 + categoryMatch + premiumMatch));

    const crossCategoryHint =
      topCategories.length > 1 && !topCategories.includes(category)
        ? `cross_${topCategories[0]}_to_${category}`
        : null;

    nodes.push({
      commerceId: node.commerceId,
      candidateLinks: offers.slice(0, 4),
      relatedCommerceIds: related,
      similarityPrepScore,
      crossCategoryHint,
      rankingMutation: false,
    });
  }

  return nodes;
}

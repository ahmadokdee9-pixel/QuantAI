/**
 * Phase 7 — Category expansion reasoner (cross-category transitions).
 */

import type { LatentIntentProfile } from "../types";
import type { RelatedCommerceGraph } from "./relatedCommerceGraph";

export type CategoryExpansionHint = {
  fromCategory: string;
  toCategory: string;
  reason: string;
  confidence01: number;
};

const MAX_HINTS = 8;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function reasonCategoryExpansion(args: {
  intent: LatentIntentProfile;
  graph: RelatedCommerceGraph;
  categoryAffinity: Record<string, number>;
}): CategoryExpansionHint[] {
  const hints: CategoryExpansionHint[] = [];
  const topCats = Object.entries(args.categoryAffinity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  for (const edge of args.graph.edges) {
    if (edge.relation !== "cross_category") continue;
    hints.push({
      fromCategory: topCats[0] ?? "general",
      toCategory: topCats[1] ?? "general",
      reason: "cross_category_transition",
      confidence01: round4(edge.weight01 * args.intent.analyticalShopping01),
    });
    if (hints.length >= MAX_HINTS) break;
  }

  if (args.intent.upgradeIntent01 >= 0.45 && topCats[0]) {
    hints.push({
      fromCategory: topCats[0],
      toCategory: topCats[0],
      reason: "upgrade_within_category",
      confidence01: round4(args.intent.upgradeIntent01),
    });
  }

  return hints.slice(0, MAX_HINTS);
}

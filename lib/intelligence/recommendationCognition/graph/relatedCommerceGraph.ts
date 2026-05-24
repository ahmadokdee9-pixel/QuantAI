/**
 * Phase 7 — Related commerce graph (canonical product edges, no vectors).
 */

import type { CanonicalProductNode } from "@/lib/intelligence/identity/types";

export type RelatedCommerceEdge = {
  fromCommerceId: string;
  toCommerceId: string;
  relation: "same_category" | "complementary" | "ecosystem" | "cross_category";
  weight01: number;
};

export type RelatedCommerceGraph = {
  edges: RelatedCommerceEdge[];
  nodeCount: number;
};

const MAX_EDGES = 32;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildRelatedCommerceGraph(
  nodes: CanonicalProductNode[],
  categoryByCommerceId: Record<string, string> = {}
): RelatedCommerceGraph {
  const edges: RelatedCommerceEdge[] = [];
  const categories = new Map<string, string[]>();

  for (const n of nodes) {
    const cat = categoryByCommerceId[n.commerceId] ?? "general";
    const list = categories.get(cat) ?? [];
    list.push(n.commerceId);
    categories.set(cat, list);
  }

  for (const [cat, ids] of categories) {
    for (let i = 0; i < ids.length && edges.length < MAX_EDGES; i++) {
      for (let j = i + 1; j < ids.length && j < i + 3 && edges.length < MAX_EDGES; j++) {
        edges.push({
          fromCommerceId: ids[i]!,
          toCommerceId: ids[j]!,
          relation: "same_category",
          weight01: round4(0.65),
        });
      }
    }
    const otherCats = [...categories.keys()].filter((c) => c !== cat);
    if (otherCats.length && ids[0] && edges.length < MAX_EDGES) {
      const target = categories.get(otherCats[0]!)?.[0];
      if (target) {
        edges.push({
          fromCommerceId: ids[0],
          toCommerceId: target,
          relation: "cross_category",
          weight01: round4(0.35),
        });
      }
    }
  }

  return { edges: edges.slice(0, MAX_EDGES), nodeCount: nodes.length };
}

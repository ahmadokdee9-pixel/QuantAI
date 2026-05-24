/**
 * Phase 4 — Canonical product graph (tray-local, deterministic).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { NormalizationEquivalenceGroup } from "@/lib/intelligence/normalization/types";
import type { CanonicalProductNode, IdentityMergeReason, VariantBoundaryTrace } from "./types";
import { buildMerchantOfferGraph, offersToCanonicalNodes } from "./merchantOfferLinker";
import { resolveTrayIdentities, canMergeIdentities } from "./productIdentityResolver";
import { buildVariantBoundaryTraces, countFalseCollapseBlocks } from "./variantBoundaryEngine";

export type CanonicalProductGraph = {
  version: string;
  nodes: CanonicalProductNode[];
  edges: CanonicalProductEdge[];
  boundaryTraces: VariantBoundaryTrace[];
  falseCollapseBlocked: number;
};

export type CanonicalProductEdge = {
  fromCommerceId: string;
  toCommerceId: string;
  reason: IdentityMergeReason;
  blocked: boolean;
};

function medianPrice(products: QuantProduct[]): number {
  const prices = products.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  if (!prices.length) return 0;
  return prices[Math.floor(prices.length / 2)] ?? 0;
}

/** Build canonical product graph from tray + normalization groups. */
export function buildCanonicalProductGraph(
  products: QuantProduct[],
  groups: NormalizationEquivalenceGroup[] = []
): CanonicalProductGraph {
  const resolved = resolveTrayIdentities(products);
  const peerMedian = medianPrice(products);
  const edges: CanonicalProductEdge[] = [];
  const boundaryTraces: VariantBoundaryTrace[] = [];

  for (const g of groups) {
    boundaryTraces.push(...buildVariantBoundaryTraces(products, g.memberLinks));
    const byLink = new Map(products.map((p, idx) => [p.link, { product: p, idx }]));
    const members = g.memberLinks
      .map((l) => byLink.get(l))
      .filter((x): x is { product: QuantProduct; idx: number } => Boolean(x));
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const merge = canMergeIdentities(members[i]!.product, members[j]!.product, peerMedian);
        const idA = resolved[members[i]!.idx]?.commerceId ?? "";
        const idB = resolved[members[j]!.idx]?.commerceId ?? "";
        if (idA && idB) {
          edges.push({
            fromCommerceId: idA,
            toCommerceId: idB,
            reason: merge.reason,
            blocked: !merge.allowed,
          });
        }
      }
    }
  }

  const offerGraph = buildMerchantOfferGraph(products);
  const metaByCommerceId = new Map(
    resolved.map((r) => [
      r.commerceId,
      {
        variantKey: r.variantKey,
        familyGraphId: r.familyGraphId,
        normalizedTitle: r.normalizedTitle,
        confidence: r.identityConfidence,
      },
    ])
  );
  const nodes = offersToCanonicalNodes(offerGraph, metaByCommerceId);

  return {
    version: "phase4",
    nodes,
    edges,
    boundaryTraces,
    falseCollapseBlocked: countFalseCollapseBlocks(
      products,
      groups.map((g) => ({ memberLinks: g.memberLinks }))
    ),
  };
}

export function graphCoverage(nodes: CanonicalProductNode[], inputCount: number): number {
  if (inputCount === 0) return 0;
  const linked = nodes.reduce((s, n) => s + n.offers.length, 0);
  return Math.round((linked / inputCount) * 10000) / 10000;
}

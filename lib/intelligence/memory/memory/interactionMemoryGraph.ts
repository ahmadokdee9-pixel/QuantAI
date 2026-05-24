/**
 * Phase 6 — Interaction memory graph (viewed patterns, compare, selections).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";

const MAX_NODES = 48;

export type InteractionMemoryNode = {
  link: string;
  commerceId: string;
  store: string;
  price: number;
  viewedWeight: number;
  trustDriven01: number;
  priceDriven01: number;
  compareAffinity01: number;
};

export type InteractionMemoryGraph = {
  nodes: InteractionMemoryNode[];
  compareBehavior01: number;
  trustSelection01: number;
  priceSelection01: number;
  nodeCount: number;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildInteractionMemoryGraph(args: {
  products: QuantProduct[];
  sessionMemory: CommerceSessionMemoryV1;
  trustResult?: TrustEngineResult | null;
}): InteractionMemoryGraph {
  const nodes: InteractionMemoryNode[] = [];
  const comfort = args.sessionMemory.priceComfortCenter;

  for (const p of args.products.slice(0, 16)) {
    const commerceId = p.qiNormalizedCommerce?.commerceId ?? p.link;
    const prep = args.trustResult?.rankingPrepByLink[p.link];
    const trustDriven01 = prep ? round4(prep.trustScore / 100) : 0.5;
    const priceDriven01 =
      comfort > 0 && p.price > 0 ? round4(Math.min(1, Math.abs(p.price - comfort) / comfort)) : 0.4;
    const compareAffinity01 = round4(
      args.products.filter((x) => x.qiCategory === p.qiCategory).length > 2 ? 0.65 : 0.25
    );

    nodes.push({
      link: p.link,
      commerceId,
      store: p.store,
      price: p.price,
      viewedWeight: 1,
      trustDriven01,
      priceDriven01,
      compareAffinity01,
    });
  }

  const bounded = nodes.slice(0, MAX_NODES);
  const compareBehavior01 =
    bounded.length > 0
      ? round4(bounded.reduce((s, n) => s + n.compareAffinity01, 0) / bounded.length)
      : 0;
  const trustSelection01 =
    bounded.length > 0
      ? round4(bounded.reduce((s, n) => s + n.trustDriven01, 0) / bounded.length)
      : 0;
  const priceSelection01 =
    bounded.length > 0
      ? round4(bounded.reduce((s, n) => s + n.priceDriven01, 0) / bounded.length)
      : 0;

  return {
    nodes: bounded,
    compareBehavior01,
    trustSelection01,
    priceSelection01,
    nodeCount: bounded.length,
  };
}

/**
 * Phase 38 — Global Commerce Graph.
 * Universal graph: Offer, Merchant, Brand, Product, Version, Alternative, Competitor.
 */

import type { GlobalAlternatives } from "@/lib/intelligence/globalAlternativeEngine";
import type { ProductUniverse } from "@/lib/intelligence/productUniverseEngine";
import type { UniversalOfferGraph } from "@/lib/intelligence/universalOfferGraphEngine";
import type { QuantProduct } from "@/lib/shoppingScore";
import { extractProductIdentity } from "@/lib/deals/productIdentity";

export type CommerceGraphNode =
  | { kind: "offer"; id: string; link: string; price: number }
  | { kind: "merchant"; id: string; store: string }
  | { kind: "brand"; id: string; brand: string }
  | { kind: "product"; id: string; title: string }
  | { kind: "version"; id: string; versionKey: string }
  | { kind: "alternative"; id: string; link: string; reason: string }
  | { kind: "competitor"; id: string; link: string; store: string };

export type GlobalCommerceGraph = {
  version: 1;
  nodes: CommerceGraphNode[];
  offerCount: number;
  merchantCount: number;
  alternativeCount: number;
  headline: string;
};

/** Build global commerce graph for tray context. */
export function buildGlobalCommerceGraph(args: {
  product: QuantProduct;
  offerGraph: UniversalOfferGraph;
  universe: ProductUniverse;
  alternatives: GlobalAlternatives;
}): GlobalCommerceGraph {
  const { product, offerGraph, universe, alternatives } = args;
  const identity = extractProductIdentity(product);
  const brand = identity.brands[0] ?? "unknown";

  const nodes: CommerceGraphNode[] = [
    { kind: "offer", id: `offer:${product.link}`, link: product.link, price: product.price },
    { kind: "merchant", id: `merchant:${product.store.toLowerCase()}`, store: product.store },
    { kind: "brand", id: `brand:${brand}`, brand },
    { kind: "product", id: `product:${universe.universeId}`, title: product.title },
    { kind: "version", id: `version:${universe.versionKey}`, versionKey: universe.versionKey },
  ];

  for (const entity of offerGraph.entities) {
    for (const offer of entity.offers) {
      if (offer.link === product.link) continue;
      nodes.push({ kind: "competitor", id: `competitor:${offer.link}`, link: offer.link, store: offer.store });
    }
  }

  const altRefs = [
    alternatives.bestSameProductCheaper,
    alternatives.bestValueAlternative,
    alternatives.bestUpgradeAlternative,
    alternatives.bestDiscountAlternative,
  ].filter(Boolean);

  for (const alt of altRefs) {
    nodes.push({
      kind: "alternative",
      id: `alternative:${alt!.link}`,
      link: alt!.link,
      reason: alt!.reason,
    });
  }

  const merchantCount = new Set(nodes.filter((n) => n.kind === "merchant" || n.kind === "competitor").map((n) => ("store" in n ? n.store : ""))).size;

  return {
    version: 1,
    nodes,
    offerCount: universe.offerCount,
    merchantCount,
    alternativeCount: altRefs.length,
    headline: `Commerce graph: ${universe.offerCount} offers · ${merchantCount} merchants · ${altRefs.length} alternatives tracked.`,
  };
}

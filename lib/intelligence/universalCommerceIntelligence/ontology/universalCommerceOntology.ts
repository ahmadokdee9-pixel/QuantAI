/**
 * Phase 16 — Universal commerce ontology engine (deterministic).
 */

import type { OntologyNode, UniversalVerticalId } from "../types";

const MAX_NODES = 12;

export function buildUniversalCommerceOntology(args: {
  query: string;
  dominantVertical: UniversalVerticalId;
}): OntologyNode[] {
  const q = args.query.toLowerCase();
  const nodes: OntologyNode[] = [
    { nodeId: "ont_product", concept: "product_entity", verticalId: args.dominantVertical },
    { nodeId: "ont_merchant", concept: "merchant_offer", verticalId: args.dominantVertical },
    { nodeId: "ont_trust", concept: "trust_signal", verticalId: "general" },
  ];
  if (/\b(compare|vs|best)\b/.test(q)) {
    nodes.push({ nodeId: "ont_compare", concept: "comparison_intent", verticalId: args.dominantVertical });
  }
  if (/\b(deal|sale|discount)\b/.test(q)) {
    nodes.push({ nodeId: "ont_deal", concept: "promotional_pressure", verticalId: args.dominantVertical });
  }
  return nodes.slice(0, MAX_NODES);
}

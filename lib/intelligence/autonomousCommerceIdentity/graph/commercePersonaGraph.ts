/**
 * Phase 13 — Commerce persona graph.
 */

import type { CommercePersonaNode } from "../types";

const MAX_PERSONAS = 6;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildCommercePersonaGraph(args: {
  personaId: string;
  luxuryBand: string;
  dominantCategory: string;
  maturity01: number;
}): CommercePersonaNode[] {
  const nodes: CommercePersonaNode[] = [
    { nodeId: "persona_primary", personaLabel: args.personaId, affinity01: round4(0.85) },
    { nodeId: "persona_luxury", personaLabel: args.luxuryBand, affinity01: round4(args.maturity01 * 0.7) },
    { nodeId: "persona_category", personaLabel: args.dominantCategory, affinity01: round4(0.55) },
  ];
  return nodes.slice(0, MAX_PERSONAS);
}

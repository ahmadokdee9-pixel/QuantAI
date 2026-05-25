/**
 * Phase 18 — Ontology refinement engine.
 */

import type { OntologyEvolutionNode } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function refineOntology(args: {
  query: string;
  dominantVertical: string;
}): { refinedConcepts: string[]; refinement01: number; nodes: OntologyEvolutionNode[] } {
  const q = args.query.toLowerCase();
  const refinedConcepts = ["commerce_entity", "trust_signal", "vertical_context"];
  if (/\b(luxury|premium)\b/.test(q)) refinedConcepts.push("luxury_evolution");
  if (/\b(gift|occasion)\b/.test(q)) refinedConcepts.push("occasion_evolution");
  const refinement01 = round4(Math.min(1, 0.35 + refinedConcepts.length / 12));
  const nodes: OntologyEvolutionNode[] = refinedConcepts.slice(0, 8).map((concept, i) => ({
    nodeId: `ont_${i}`,
    concept,
    refinement01: round4(refinement01 * (0.9 - i * 0.05)),
  }));
  return { refinedConcepts: refinedConcepts.slice(0, 6), refinement01, nodes };
}

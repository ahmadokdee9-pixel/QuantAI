/**
 * Phase 18 — Deterministic evolution graph.
 */

import type { EvolutionGraphNode } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildDeterministicEvolutionGraph(args: {
  heuristicDelta01: number;
  ontologyRefinement01: number;
  strategyDelta01: number;
  trustAdaptation01: number;
}): EvolutionGraphNode[] {
  return [
    { nodeId: "heuristic", evolutionKind: "heuristic_shift", delta01: round4(args.heuristicDelta01) },
    { nodeId: "ontology", evolutionKind: "ontology_refine", delta01: round4(args.ontologyRefinement01) },
    { nodeId: "strategy", evolutionKind: "strategy_bounded", delta01: round4(args.strategyDelta01) },
    { nodeId: "trust", evolutionKind: "trust_adapt", delta01: round4(args.trustAdaptation01) },
  ];
}

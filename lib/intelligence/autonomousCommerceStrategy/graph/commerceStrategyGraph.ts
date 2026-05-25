/**
 * Phase 15 — Autonomous commerce strategy graph.
 */

import type { StrategyAxisId, CommerceStrategyGraphNode } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildCommerceStrategyGraph(
  axes: { axis: StrategyAxisId; score01: number }[]
): CommerceStrategyGraphNode[] {
  return axes
    .map((a, i) => ({
      nodeId: `csg_${a.axis}_${i}`,
      axis: a.axis,
      score01: round4(a.score01),
    }))
    .sort((a, b) => b.score01 - a.score01)
    .slice(0, 13);
}

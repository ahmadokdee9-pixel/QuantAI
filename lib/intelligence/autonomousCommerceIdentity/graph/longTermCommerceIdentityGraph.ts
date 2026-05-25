/**
 * Phase 13 — Long-term commerce identity graph.
 */

import type { IdentityAxisId, IdentityGraphNode } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

const MAX_NODES = 12;

export function buildLongTermCommerceIdentityGraph(
  axes: { axis: IdentityAxisId; score01: number }[]
): IdentityGraphNode[] {
  return axes
    .map((a, i) => ({
      nodeId: `idg_${a.axis}_${i}`,
      axis: a.axis,
      score01: round4(a.score01),
    }))
    .sort((a, b) => b.score01 - a.score01)
    .slice(0, MAX_NODES);
}

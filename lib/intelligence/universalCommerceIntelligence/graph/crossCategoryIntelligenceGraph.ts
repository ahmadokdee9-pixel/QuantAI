/**
 * Phase 16 — Cross-category intelligence graph.
 */

import type { CrossCategoryGraphNode, UniversalVerticalId } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildCrossCategoryIntelligenceGraph(
  verticalIntelligence: Record<UniversalVerticalId, { score01: number; active: boolean }>
): CrossCategoryGraphNode[] {
  return (Object.entries(verticalIntelligence) as [UniversalVerticalId, { score01: number }][])
    .filter(([, v]) => v.score01 > 0.15)
    .map(([verticalId, v], i) => ({
      nodeId: `ccg_${verticalId}_${i}`,
      verticalId,
      score01: round4(v.score01),
    }))
    .sort((a, b) => b.score01 - a.score01)
    .slice(0, 10);
}

/**
 * Phase 14 — Predictive intent graph.
 */

import type { PredictionAxisId, PredictiveIntentGraphNode } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildPredictiveIntentGraph(
  axes: { axis: PredictionAxisId; score01: number }[]
): PredictiveIntentGraphNode[] {
  return axes
    .map((a, i) => ({
      nodeId: `pig_${a.axis}_${i}`,
      axis: a.axis,
      score01: round4(a.score01),
    }))
    .sort((a, b) => b.score01 - a.score01)
    .slice(0, 13);
}

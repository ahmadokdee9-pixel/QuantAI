/**
 * Phase 12 — Shadow-only signal influence graph (no ranking mutation).
 */

import type { FusedLiveSignal, ShadowSignalInfluenceEdge } from "../types";

const MAX_EDGES = 16;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildShadowSignalInfluenceGraph(
  signals: FusedLiveSignal[]
): { edges: ShadowSignalInfluenceEdge[] } {
  const sorted = [...signals].sort((a, b) => b.trustAdjusted01 - a.trustAdjusted01);
  const edges: ShadowSignalInfluenceEdge[] = [];

  for (let i = 0; i < sorted.length - 1 && edges.length < MAX_EDGES; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    if (!from || !to) continue;
    edges.push({
      from: from.signalId,
      to: to.signalId,
      influence01: round4(Math.min(0.12, from.weight01 * 0.5)),
    });
  }

  if (signals.some((s) => s.signalId === "trust_weighted")) {
    const trust = signals.find((s) => s.signalId === "trust_weighted");
    const market = signals.find((s) => s.signalId === "market_interpretation");
    if (trust && market) {
      edges.unshift({
        from: "trust_weighted",
        to: "market_interpretation",
        influence01: round4(trust.trustAdjusted01 * 0.08),
      });
    }
  }

  return { edges: edges.slice(0, MAX_EDGES) };
}

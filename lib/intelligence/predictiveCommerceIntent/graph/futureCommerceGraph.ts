/**
 * Phase 14 — Future commerce graph.
 */

import type { FutureCommerceGraphNode } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildFutureCommerceGraph(args: {
  temporalHorizon: string;
  replacementCycle01: number;
  purchaseProbability01: number;
  seasonalForecast01: number;
}): FutureCommerceGraphNode[] {
  const horizonMap: Record<string, FutureCommerceGraphNode["horizon"]> = {
    immediate: "immediate",
    session: "session",
    near_term: "session",
    seasonal: "seasonal",
    distant: "replacement",
    replacement_window_open: "replacement",
  };
  const h = horizonMap[args.temporalHorizon] ?? "session";
  return [
    { nodeId: "fcg_primary", horizon: h, forecast01: round4(args.purchaseProbability01) },
    { nodeId: "fcg_replacement", horizon: "replacement", forecast01: round4(args.replacementCycle01) },
    { nodeId: "fcg_seasonal", horizon: "seasonal", forecast01: round4(args.seasonalForecast01) },
  ];
}

/**
 * Phase 12 — Commerce timing graph (deterministic nodes).
 */

import type { CommerceTimingNode } from "../types";
import type { TemporalMarketMemorySnapshot } from "../memory/temporalMarketMemory";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildCommerceTimingGraph(args: {
  memory: TemporalMarketMemorySnapshot;
  macroScore01: number;
  momentum01: number;
  lifecycleWave01: number;
}): CommerceTimingNode[] {
  const nodes: CommerceTimingNode[] = [];
  const horizonMap: Record<string, CommerceTimingNode["horizon"]> = {
    immediate: "immediate",
    session: "session",
    seasonal: "seasonal",
    macro: "macro",
  };

  for (const label of args.memory.horizonLabels) {
    const horizon = horizonMap[label] ?? "session";
    const base =
      horizon === "immediate"
        ? args.momentum01
        : horizon === "session"
          ? args.momentum01 * 0.85
          : horizon === "seasonal"
            ? args.lifecycleWave01
            : args.macroScore01;
    nodes.push({
      nodeId: `timing_${horizon}`,
      horizon,
      score01: round4(base),
    });
  }

  if (nodes.length === 0) {
    nodes.push({ nodeId: "timing_neutral", horizon: "session", score01: 0.25 });
  }
  return nodes.slice(0, 8);
}

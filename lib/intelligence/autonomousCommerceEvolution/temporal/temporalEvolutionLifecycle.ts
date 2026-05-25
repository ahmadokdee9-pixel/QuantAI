/**
 * Phase 18 — Temporal evolution lifecycle.
 */

import type { TemporalEvolutionNode } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildTemporalEvolutionLifecycle(args: {
  calibrationBand: string;
  lifecycleStrength01: number;
}): TemporalEvolutionNode[] {
  return [
    { nodeId: "calibration", phase: args.calibrationBand, score01: round4(0.5) },
    { nodeId: "lifecycle", phase: "adaptation_window", score01: round4(args.lifecycleStrength01) },
    { nodeId: "orchestration", phase: "temporal_shadow", score01: 0.35 },
  ];
}

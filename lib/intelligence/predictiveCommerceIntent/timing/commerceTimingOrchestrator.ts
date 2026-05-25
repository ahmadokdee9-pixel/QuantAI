/**
 * Phase 14 — Commerce timing orchestrator.
 */

import type { ReplaySafePredictiveMemory } from "../memory/replaySafePredictiveMemory";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function orchestrateCommerceTiming(args: {
  memory: ReplaySafePredictiveMemory;
  temporalHorizon: string;
  urgency01: number;
  readiness01: number;
}): { primaryHorizon: string; timingScore01: number } {
  const primaryHorizon = args.memory.horizonSlots[0] ?? args.temporalHorizon;
  const timingScore01 = round4(
    Math.min(1, args.readiness01 * 0.55 + args.urgency01 * 0.45)
  );
  return { primaryHorizon, timingScore01 };
}

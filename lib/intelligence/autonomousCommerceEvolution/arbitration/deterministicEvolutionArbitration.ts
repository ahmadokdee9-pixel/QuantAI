/**
 * Phase 18 — Deterministic evolution arbitration.
 */

import type { FusedEvolutionSignal } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function arbitrateEvolutionSignals(signals: FusedEvolutionSignal[]): {
  dominantAxis: string;
  arbitration01: number;
} {
  const top = signals[0];
  if (!top) return { dominantAxis: "none", arbitration01: 0 };
  return { dominantAxis: top.axisId, arbitration01: round4(top.trustAdjusted01) };
}

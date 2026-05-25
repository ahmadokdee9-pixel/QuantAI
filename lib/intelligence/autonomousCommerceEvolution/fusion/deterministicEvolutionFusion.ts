/**
 * Phase 18 — Deterministic evolution fusion.
 */

import type { EvolutionAxisId, FusedEvolutionSignal } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

const AXIS_WEIGHTS: Record<EvolutionAxisId, number> = {
  heuristic: 0.1,
  ontology: 0.09,
  cognition: 0.09,
  strategy: 0.09,
  category: 0.09,
  trust: 0.11,
  lifecycle: 0.08,
  regional: 0.07,
  calibration: 0.1,
  memory: 0.08,
  pattern: 0.08,
  temporal: 0.12,
};

export function fuseDeterministicEvolutionSignals(
  raw: { axisId: EvolutionAxisId; strength01: number }[],
  trust01: number
): FusedEvolutionSignal[] {
  const fused = raw.map((r) => ({
    axisId: r.axisId,
    weight01: round4(AXIS_WEIGHTS[r.axisId] ?? 0.05),
    strength01: round4(clamp01(r.strength01)),
    trustAdjusted01: round4(clamp01(r.strength01 * (0.76 + trust01 * 0.24))),
  }));
  fused.sort((a, b) => b.trustAdjusted01 - a.trustAdjusted01);
  return fused.slice(0, 12);
}

export function computeFusedEvolutionScore(signals: FusedEvolutionSignal[]): number {
  let sum = 0;
  let w = 0;
  for (const s of signals) {
    sum += s.trustAdjusted01 * s.weight01;
    w += s.weight01;
  }
  return round4(clamp01(w > 0 ? sum / w : 0));
}

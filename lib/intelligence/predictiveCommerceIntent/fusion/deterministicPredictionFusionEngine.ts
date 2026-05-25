/**
 * Phase 14 — Deterministic prediction fusion engine.
 */

import type { FusedPredictionSignal, PredictionAxisId } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

const AXIS_WEIGHTS: Record<PredictionAxisId, number> = {
  readiness: 0.14,
  purchase_probability: 0.13,
  replacement: 0.09,
  upgrade: 0.1,
  urgency: 0.1,
  momentum: 0.09,
  demand_accel: 0.08,
  temporal: 0.1,
  lifecycle: 0.08,
  seasonal: 0.07,
  regional: 0.05,
  trend: 0.05,
  confidence: 0.02,
};

export function fuseDeterministicPredictions(
  raw: { axisId: PredictionAxisId; strength01: number }[]
): FusedPredictionSignal[] {
  const fused = raw.map((r) => ({
    axisId: r.axisId,
    weight01: round4(AXIS_WEIGHTS[r.axisId] ?? 0.05),
    strength01: round4(clamp01(r.strength01)),
    trustAdjusted01: round4(clamp01(r.strength01)),
  }));
  fused.sort((a, b) => b.trustAdjusted01 - a.trustAdjusted01);
  return fused.slice(0, 13);
}

export function computeFusedPredictionScore(signals: FusedPredictionSignal[]): number {
  let sum = 0;
  let w = 0;
  for (const s of signals) {
    sum += s.trustAdjusted01 * s.weight01;
    w += s.weight01;
  }
  return round4(clamp01(w > 0 ? sum / w : 0));
}

/**
 * Phase 16 — Deterministic category fusion engine.
 */

import type { FusedUniversalSignal, UniversalAxisId, UniversalVerticalId } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

const AXIS_WEIGHTS: Record<UniversalAxisId, number> = {
  category_cognition: 0.14,
  cross_category: 0.1,
  aesthetic: 0.09,
  lifecycle: 0.08,
  timing: 0.1,
  trust: 0.12,
  merchant: 0.08,
  volatility: 0.07,
  premium_utility: 0.09,
  regional: 0.06,
  ontology: 0.07,
};

export function fuseDeterministicCategorySignals(
  raw: { axisId: UniversalAxisId; verticalId: UniversalVerticalId; strength01: number }[],
  trust01: number
): FusedUniversalSignal[] {
  const fused = raw.map((r) => ({
    axisId: r.axisId,
    verticalId: r.verticalId,
    weight01: round4(AXIS_WEIGHTS[r.axisId] ?? 0.05),
    strength01: round4(clamp01(r.strength01)),
    trustAdjusted01: round4(clamp01(r.strength01 * (0.8 + trust01 * 0.2))),
  }));
  fused.sort((a, b) => b.trustAdjusted01 - a.trustAdjusted01);
  return fused.slice(0, 11);
}

export function computeFusedUniversalScore(signals: FusedUniversalSignal[]): number {
  let sum = 0;
  let w = 0;
  for (const s of signals) {
    sum += s.trustAdjusted01 * s.weight01;
    w += s.weight01;
  }
  return round4(clamp01(w > 0 ? sum / w : 0));
}

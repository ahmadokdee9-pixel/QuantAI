/**
 * Phase 13 — Deterministic identity fusion engine.
 */

import type { FusedIdentitySignal, IdentityAxisId } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

const AXIS_WEIGHTS: Record<IdentityAxisId, number> = {
  taste: 0.14,
  category: 0.12,
  premium: 0.11,
  value: 0.09,
  luxury: 0.1,
  lifecycle: 0.1,
  regional: 0.07,
  intent: 0.11,
  maturity: 0.09,
  trust: 0.07,
};

export function fuseDeterministicIdentitySignals(
  raw: { axisId: IdentityAxisId; strength01: number }[]
): FusedIdentitySignal[] {
  const fused = raw.map((r) => ({
    axisId: r.axisId,
    weight01: round4(AXIS_WEIGHTS[r.axisId] ?? 0.05),
    strength01: round4(clamp01(r.strength01)),
    trustAdjusted01: round4(clamp01(r.strength01)),
  }));
  fused.sort((a, b) => b.trustAdjusted01 - a.trustAdjusted01);
  return fused.slice(0, 10);
}

export function computeFusedIdentityScore(signals: FusedIdentitySignal[]): number {
  let sum = 0;
  let w = 0;
  for (const s of signals) {
    sum += s.trustAdjusted01 * s.weight01;
    w += s.weight01;
  }
  return round4(clamp01(w > 0 ? sum / w : 0));
}

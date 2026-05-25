/**
 * Phase 15 — Deterministic strategy fusion engine.
 */

import type { FusedStrategySignal, StrategyAxisId } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

const AXIS_WEIGHTS: Record<StrategyAxisId, number> = {
  trust_value_risk: 0.14,
  timing: 0.12,
  replacement: 0.08,
  upgrade: 0.09,
  affordability: 0.1,
  economic: 0.08,
  merchant: 0.09,
  volatility: 0.07,
  lifecycle: 0.08,
  premium_value: 0.08,
  regional: 0.05,
  pressure: 0.06,
  confidence: 0.06,
};

export function fuseDeterministicStrategySignals(
  raw: { axisId: StrategyAxisId; strength01: number }[]
): FusedStrategySignal[] {
  const fused = raw.map((r) => ({
    axisId: r.axisId,
    weight01: round4(AXIS_WEIGHTS[r.axisId] ?? 0.05),
    strength01: round4(clamp01(r.strength01)),
    trustAdjusted01: round4(clamp01(r.strength01)),
  }));
  fused.sort((a, b) => b.trustAdjusted01 - a.trustAdjusted01);
  return fused.slice(0, 13);
}

export function computeFusedStrategyScore(signals: FusedStrategySignal[]): number {
  let sum = 0;
  let w = 0;
  for (const s of signals) {
    sum += s.trustAdjusted01 * s.weight01;
    w += s.weight01;
  }
  return round4(clamp01(w > 0 ? sum / w : 0));
}

export function applyTrustToStrategySignals(
  signals: FusedStrategySignal[],
  trust01: number
): FusedStrategySignal[] {
  return signals.map((s) => ({
    ...s,
    trustAdjusted01: round4(clamp01(s.strength01 * (0.75 + trust01 * 0.25))),
  }));
}

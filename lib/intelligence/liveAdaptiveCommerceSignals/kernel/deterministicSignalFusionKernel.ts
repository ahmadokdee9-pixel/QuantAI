/**
 * Phase 12 — Deterministic live signal fusion kernel.
 */

import type { FusedLiveSignal, LiveSignalId } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

const SIGNAL_WEIGHTS: Record<LiveSignalId, number> = {
  market_interpretation: 0.14,
  momentum: 0.12,
  regional: 0.08,
  category_pressure: 0.1,
  macro_timing: 0.1,
  demand_shift: 0.11,
  pricing_climate: 0.1,
  merchant_ecosystem: 0.07,
  lifecycle_wave: 0.09,
  seasonal_accel: 0.08,
  volatility: 0.06,
  trust_weighted: 0.05,
};

export function fuseDeterministicLiveSignals(
  raw: { signalId: LiveSignalId; strength01: number }[]
): FusedLiveSignal[] {
  const fused: FusedLiveSignal[] = [];
  for (const r of raw) {
    const weight01 = SIGNAL_WEIGHTS[r.signalId] ?? 0.05;
    fused.push({
      signalId: r.signalId,
      weight01: round4(weight01),
      strength01: round4(clamp01(r.strength01)),
      trustAdjusted01: round4(clamp01(r.strength01)),
    });
  }
  fused.sort((a, b) => b.trustAdjusted01 - a.trustAdjusted01);
  return fused.slice(0, 12);
}

export function computeFusedLiveScore(signals: FusedLiveSignal[]): number {
  if (signals.length === 0) return 0;
  let sum = 0;
  let w = 0;
  for (const s of signals) {
    sum += s.trustAdjusted01 * s.weight01;
    w += s.weight01;
  }
  return round4(clamp01(w > 0 ? sum / w : 0));
}

/**
 * Phase 17 — Deterministic emotional fusion.
 */

import type { EmotionalAxisId, FusedEmotionalSignal } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

const AXIS_WEIGHTS: Record<EmotionalAxisId, number> = {
  aesthetic: 0.1,
  lifestyle: 0.08,
  premium_attraction: 0.09,
  luxury_psychology: 0.08,
  purchase_driver: 0.09,
  impulse_rational: 0.08,
  style_personality: 0.08,
  emotional_trust: 0.11,
  confidence_aspiration: 0.08,
  comfort_status_utility: 0.08,
  emotional_timing: 0.07,
  lifecycle: 0.08,
  regional: 0.08,
};

export function fuseDeterministicEmotionalSignals(
  raw: { axisId: EmotionalAxisId; strength01: number }[],
  emotionalTrust01: number
): FusedEmotionalSignal[] {
  const fused = raw.map((r) => ({
    axisId: r.axisId,
    weight01: round4(AXIS_WEIGHTS[r.axisId] ?? 0.05),
    strength01: round4(clamp01(r.strength01)),
    trustAdjusted01: round4(clamp01(r.strength01 * (0.78 + emotionalTrust01 * 0.22))),
  }));
  fused.sort((a, b) => b.trustAdjusted01 - a.trustAdjusted01);
  return fused.slice(0, 13);
}

export function computeFusedEmotionalScore(signals: FusedEmotionalSignal[]): number {
  let sum = 0;
  let w = 0;
  for (const s of signals) {
    sum += s.trustAdjusted01 * s.weight01;
    w += s.weight01;
  }
  return round4(clamp01(w > 0 ? sum / w : 0));
}

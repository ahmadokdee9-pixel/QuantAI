/**
 * Phase 14 — Trust-aware prediction fusion.
 */

import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { FusedPredictionSignal } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function applyTrustAwarePredictionFusion(
  signals: FusedPredictionSignal[],
  trust?: TrustEngineResult | null
): FusedPredictionSignal[] {
  const factor = trust?.meta.enabled
    ? clamp01(1 - (trust.meta.fakeDiscountAlertCount ?? 0) / 10)
    : 0.82;
  return signals.map((s) => ({
    ...s,
    trustAdjusted01: round4(clamp01(s.strength01 * factor)),
  }));
}

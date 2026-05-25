/**
 * Phase 13 — Trust-aware identity weighting.
 */

import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { FusedIdentitySignal } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function applyTrustAwareIdentityWeighting(
  signals: FusedIdentitySignal[],
  trust?: TrustEngineResult | null
): FusedIdentitySignal[] {
  const trustFactor = trust?.meta.enabled
    ? clamp01(1 - (trust.meta.fakeDiscountAlertCount ?? 0) / 10)
    : 0.8;
  return signals.map((s) => ({
    ...s,
    trustAdjusted01:
      s.axisId === "trust" || s.axisId === "premium"
        ? round4(clamp01(s.strength01 * trustFactor))
        : round4(clamp01(s.strength01 * (0.85 + trustFactor * 0.15))),
  }));
}

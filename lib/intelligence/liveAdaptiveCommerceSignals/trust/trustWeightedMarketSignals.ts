/**
 * Phase 12 — Trust-weighted market signals.
 */

import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { FusedLiveSignal, LiveSignalId } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function applyTrustWeightedMarketSignals(
  signals: FusedLiveSignal[],
  trust?: TrustEngineResult | null
): FusedLiveSignal[] {
  const trustWeight = trust?.meta.enabled
    ? clamp01(1 - (trust.meta.fakeDiscountAlertCount ?? 0) / 8)
    : 0.75;

  const downweightPricing =
    (trust?.meta.fakeDiscountAlertCount ?? 0) > 2 ? 0.65 : 1;

  return signals.map((s) => {
    let adj = trustWeight;
    if (s.signalId === "pricing_climate" || s.signalId === "market_interpretation") {
      adj = round4(clamp01(adj * downweightPricing));
    }
    return {
      ...s,
      trustAdjusted01: round4(clamp01(s.strength01 * adj)),
    };
  });
}

export function buildTrustWeightedAnchor(trust?: TrustEngineResult | null): {
  signalId: LiveSignalId;
  weight01: number;
  strength01: number;
  trustAdjusted01: number;
} {
  const alerts = trust?.meta.fakeDiscountAlertCount ?? 0;
  const strength01 = round4(clamp01(1 - alerts / 6));
  return {
    signalId: "trust_weighted",
    weight01: 0.12,
    strength01,
    trustAdjusted01: strength01,
  };
}

/**
 * Phase 14 — Intent momentum tracking.
 */

import type { LiveCommerceSignalsResult } from "@/lib/intelligence/liveAdaptiveCommerceSignals/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function trackIntentMomentum(liveSignals?: LiveCommerceSignalsResult | null): {
  momentum01: number;
  acceleration01: number;
} {
  const momentum01 = round4(liveSignals?.momentum.momentum01 ?? 0.25);
  const acceleration01 = round4(liveSignals?.momentum.acceleration01 ?? momentum01 * 0.85);
  return { momentum01, acceleration01 };
}

/**
 * Phase 15 — Commerce pressure balancing.
 */

import type { LiveCommerceSignalsResult } from "@/lib/intelligence/liveAdaptiveCommerceSignals/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function balanceCommercePressure(liveSignals?: LiveCommerceSignalsResult | null): {
  balance01: number;
  dominantPressure: string;
} {
  const pressure = liveSignals?.categoryPressure.pressure01 ?? 0.25;
  const momentum = liveSignals?.momentum.momentum01 ?? 0.25;
  const balance01 = round4(Math.min(1, (pressure + momentum) / 2));
  const dominantPressure = liveSignals?.categoryPressure.dominantCategory ?? "general";
  return { balance01, dominantPressure };
}

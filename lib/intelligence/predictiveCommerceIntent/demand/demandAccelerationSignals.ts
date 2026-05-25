/**
 * Phase 14 — Demand acceleration signals.
 */

import type { LiveCommerceSignalsResult } from "@/lib/intelligence/liveAdaptiveCommerceSignals/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function detectDemandAcceleration(liveSignals?: LiveCommerceSignalsResult | null): {
  accel01: number;
  direction: "up" | "stable" | "down";
} {
  const shift = liveSignals?.demandShift ?? { shift01: 0.25, direction: "stable" };
  const accel01 = round4(shift.shift01 * 0.6 + (liveSignals?.momentum.acceleration01 ?? 0.2) * 0.4);
  const direction = shift.direction;
  return { accel01, direction };
}

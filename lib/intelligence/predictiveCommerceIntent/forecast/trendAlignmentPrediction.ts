/**
 * Phase 14 — Trend alignment prediction.
 */

import type { LiveCommerceSignalsResult } from "@/lib/intelligence/liveAdaptiveCommerceSignals/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function predictTrendAlignment(liveSignals?: LiveCommerceSignalsResult | null): {
  alignment01: number;
  trendLabel: string;
} {
  const momentum = liveSignals?.momentum.momentum01 ?? 0.25;
  const movement = liveSignals?.marketInterpretation.movementLabel ?? "stable";
  const alignment01 = round4(momentum * 0.7 + (movement === "accelerating" ? 0.25 : 0));
  const trendLabel = movement === "accelerating" ? "aligned_up" : movement === "cooling" ? "aligned_down" : "neutral";
  return { alignment01, trendLabel };
}

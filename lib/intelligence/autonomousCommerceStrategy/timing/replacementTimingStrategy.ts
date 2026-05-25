/**
 * Phase 15 — Replacement timing strategy.
 */

import type { PredictiveCommerceIntentResult } from "@/lib/intelligence/predictiveCommerceIntent/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function planReplacementTiming(predictive?: PredictiveCommerceIntentResult | null): {
  strategyLabel: string;
  score01: number;
} {
  const cycle = predictive?.replacementCycle.cycle01 ?? 0.2;
  const label = predictive?.replacementCycle.windowLabel ?? "replacement_distant";
  return { strategyLabel: label, score01: round4(cycle) };
}

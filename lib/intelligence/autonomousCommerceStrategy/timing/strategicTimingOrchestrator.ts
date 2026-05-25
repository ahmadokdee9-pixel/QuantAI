/**
 * Phase 15 — Strategic timing orchestrator.
 */

import type { PredictiveCommerceIntentResult } from "@/lib/intelligence/predictiveCommerceIntent/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function orchestrateStrategicTiming(
  predictive?: PredictiveCommerceIntentResult | null
): { timingScore01: number; label: string } {
  const readiness = predictive?.readiness.readiness01 ?? 0.25;
  const urgency = predictive?.urgency.urgency01 ?? 0.2;
  const timingScore01 = round4(Math.min(1, readiness * 0.55 + urgency * 0.45));
  const label =
    timingScore01 > 0.6 ? "act_now_shadow" : timingScore01 > 0.35 ? "wait_optimal_window" : "defer";
  return { timingScore01, label };
}

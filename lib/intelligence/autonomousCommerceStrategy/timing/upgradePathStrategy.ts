/**
 * Phase 15 — Upgrade path strategy.
 */

import type { PredictiveCommerceIntentResult } from "@/lib/intelligence/predictiveCommerceIntent/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function planUpgradePath(predictive?: PredictiveCommerceIntentResult | null): {
  pathLabel: string;
  score01: number;
} {
  return {
    pathLabel: predictive?.upgradeTiming.label ?? "no_upgrade_signal",
    score01: round4(predictive?.upgradeTiming.timing01 ?? 0.2),
  };
}

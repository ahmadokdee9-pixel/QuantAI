/**
 * Phase 18 — Bounded strategy evolution.
 */

import type { AutonomousCommerceStrategyResult } from "@/lib/intelligence/autonomousCommerceStrategy/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function evolveBoundedStrategy(args: {
  commerceStrategy?: AutonomousCommerceStrategyResult | null;
}): { strategyBand: string; boundedDelta01: number } {
  const premium = args.commerceStrategy?.premiumValue.premiumBias01 ?? 0.35;
  const boundedDelta01 = round4(Math.min(0.08, premium * 0.12));
  const strategyBand =
    premium > 0.55 ? "premium_evolution" : premium < 0.28 ? "value_evolution" : "balanced_evolution";
  return { strategyBand, boundedDelta01 };
}

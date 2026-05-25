/**
 * Phase 15 — Bounded commerce strategist.
 */

import type { FusedStrategySignal } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function selectPrimaryStrategy(signals: FusedStrategySignal[]): string {
  const top = signals[0];
  if (!top) return "neutral_strategy";
  if (top.axisId === "timing" && top.trustAdjusted01 > 0.55) return "timing_first";
  if (top.axisId === "trust_value_risk" && top.trustAdjusted01 > 0.5) return "trust_value_balanced";
  if (top.axisId === "affordability") return "affordability_guarded";
  return `axis_${top.axisId}`;
}

export function scoreStrategyConfidence(args: {
  fusedScore01: number;
  balance01: number;
  regretMinimized: boolean;
  governanceAllowed: boolean;
}): number {
  if (!args.governanceAllowed) return 0;
  let score = args.fusedScore01 * 0.5 + args.balance01 * 0.35;
  if (args.regretMinimized) score += 0.1;
  return round4(Math.min(1, score));
}

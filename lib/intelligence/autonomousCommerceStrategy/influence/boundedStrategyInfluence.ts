/**
 * Phase 15 — Bounded strategy influence (shadow only).
 */

import type { FusedStrategySignal } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function computeBoundedStrategyInfluence(
  signals: FusedStrategySignal[],
  maxInfluence01: number,
  governanceAllowed: boolean
): { totalInfluence01: number; capped: true; rankingMutation: false } {
  if (!governanceAllowed) {
    return { totalInfluence01: 0, capped: true, rankingMutation: false };
  }
  const raw = signals.reduce((a, s) => a + s.weight01 * s.trustAdjusted01, 0);
  return {
    totalInfluence01: round4(Math.min(maxInfluence01, raw * 0.4)),
    capped: true,
    rankingMutation: false,
  };
}

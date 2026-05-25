/**
 * Phase 14 — Seasonal purchase forecasting.
 */

import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function forecastSeasonalPurchase(args: {
  query: string;
  evolution?: CommerceEvolutionResult | null;
}): { seasonLabel: string; forecast01: number } {
  const q = args.query.toLowerCase();
  const seasonal = args.evolution?.seasonal;
  let forecast01 = (seasonal?.seasonalShift01 ?? 0.2) + (seasonal?.holidayProximity01 ?? 0.15);
  const seasonLabel = /\b(holiday|christmas|black friday|summer sale)\b/.test(q)
    ? "peak_season"
    : /\b(back to school|spring)\b/.test(q)
      ? "transition_season"
      : "off_season";
  if (seasonLabel !== "off_season") forecast01 += 0.2;
  return { seasonLabel, forecast01: round4(Math.min(1, forecast01)) };
}

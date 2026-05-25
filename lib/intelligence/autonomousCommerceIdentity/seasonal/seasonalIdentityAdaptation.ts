/**
 * Phase 13 — Seasonal identity adaptation.
 */

import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function adaptSeasonalIdentity(args: {
  query: string;
  evolution?: CommerceEvolutionResult | null;
}): { adaptation01: number; seasonLabel: string } {
  const q = args.query.toLowerCase();
  const seasonal = args.evolution?.seasonal;
  let adaptation01 = seasonal?.seasonalShift01 ?? 0.2;
  const seasonLabel = /\b(winter|summer|holiday|christmas)\b/.test(q)
    ? "seasonal_peak"
    : /\b(spring|fall|back to school)\b/.test(q)
      ? "seasonal_transition"
      : "off_season";
  if (seasonLabel !== "off_season") adaptation01 += 0.15;
  return { adaptation01: round4(Math.min(1, adaptation01)), seasonLabel };
}

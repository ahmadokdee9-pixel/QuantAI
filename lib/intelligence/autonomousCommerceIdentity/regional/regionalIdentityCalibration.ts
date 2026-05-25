/**
 * Phase 13 — Regional identity calibration.
 */

import type { LiveCommerceSignalsResult } from "@/lib/intelligence/liveAdaptiveCommerceSignals/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function calibrateRegionalIdentity(args: {
  query: string;
  liveSignals?: LiveCommerceSignalsResult | null;
}): { regionLabel: string; calibration01: number } {
  const q = args.query.toLowerCase();
  const regionLabel = args.liveSignals?.regional.regionLabel ?? "global";
  let calibration01 = args.liveSignals?.regional.regionalPressure01 ?? 0.25;
  if (/\b(nl|netherlands|eu|europe|us|uk)\b/.test(q)) calibration01 += 0.2;
  return { regionLabel, calibration01: round4(Math.min(1, calibration01)) };
}

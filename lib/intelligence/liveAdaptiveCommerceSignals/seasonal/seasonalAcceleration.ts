/**
 * Phase 12 — Seasonal acceleration / deceleration.
 */

import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function measureSeasonalAcceleration(evolution?: CommerceEvolutionResult | null): {
  acceleration01: number;
  deceleration01: number;
} {
  const seasonal = evolution?.seasonal;
  const shift = seasonal?.seasonalShift01 ?? 0.2;
  const holiday = seasonal?.holidayProximity01 ?? 0.15;
  const acceleration01 = round4(clamp01(shift * 0.55 + holiday * 0.45));
  const deceleration01 = round4(clamp01(1 - acceleration01 * 0.85));
  return { acceleration01, deceleration01 };
}

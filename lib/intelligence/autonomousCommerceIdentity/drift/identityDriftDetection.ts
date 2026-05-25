/**
 * Phase 13 — Identity drift detection.
 */

import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function detectIdentityDrift(evolution?: CommerceEvolutionResult | null): {
  drift01: number;
  band: "stable" | "moderate" | "elevated";
} {
  const taste = evolution?.tasteEvolution;
  const drift01 = round4(
    clamp01(
      (taste?.tasteDrift01 ?? 0.15) * 0.5 +
        (taste?.premiumDrift01 ?? 0.1) * 0.3 +
        (taste?.valueDrift01 ?? 0.1) * 0.2
    )
  );
  const band: "stable" | "moderate" | "elevated" =
    drift01 > 0.5 ? "elevated" : drift01 > 0.28 ? "moderate" : "stable";
  return { drift01, band };
}

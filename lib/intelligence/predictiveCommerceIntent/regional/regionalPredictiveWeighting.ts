/**
 * Phase 14 — Regional predictive weighting.
 */

import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function weightRegionalPrediction(
  commerceIdentity?: AutonomousCommerceIdentityResult | null
): { regionLabel: string; weight01: number } {
  return {
    regionLabel: commerceIdentity?.regionalCalibration.regionLabel ?? "global",
    weight01: round4(commerceIdentity?.regionalCalibration.calibration01 ?? 0.25),
  };
}

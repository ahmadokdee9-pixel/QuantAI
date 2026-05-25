/**
 * Phase 15 — Regional strategy adaptation.
 */

import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function adaptRegionalStrategy(commerceIdentity?: AutonomousCommerceIdentityResult | null): {
  regionLabel: string;
  adaptation01: number;
} {
  return {
    regionLabel: commerceIdentity?.regionalCalibration.regionLabel ?? "global",
    adaptation01: round4(commerceIdentity?.regionalCalibration.calibration01 ?? 0.25),
  };
}

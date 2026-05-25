/**
 * Phase 16 — Regional category adaptation.
 */

import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function adaptRegionalCategory(args: {
  query: string;
  commerceIdentity?: AutonomousCommerceIdentityResult | null;
}): { regionLabel: string; weight01: number } {
  const q = args.query.toLowerCase();
  let regionLabel = args.commerceIdentity?.regionalCalibration.regionLabel ?? "global";
  let weight01 = args.commerceIdentity?.regionalCalibration.calibration01 ?? 0.25;
  if (/\b(nl|netherlands|dutch)\b/.test(q)) {
    regionLabel = "nl";
    weight01 += 0.2;
  }
  if (/\b(eu|europe)\b/.test(q)) {
    regionLabel = "eu";
    weight01 += 0.15;
  }
  return { regionLabel, weight01: round4(Math.min(1, weight01)) };
}

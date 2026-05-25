/**
 * Phase 18 — Regional adaptation evolution.
 */

import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function evolveRegionalAdaptation(args: {
  query: string;
  commerceIdentity?: AutonomousCommerceIdentityResult | null;
}): { regionLabel: string; weight01: number } {
  const q = args.query.toLowerCase();
  let regionLabel = args.commerceIdentity?.regionalCalibration.regionLabel ?? "global_neutral";
  if (/\b(uk|eu|us|nl|de)\b/.test(q)) regionLabel = `${q.match(/\b(uk|eu|us|nl|de)\b/)?.[0] ?? "global"}_evolution`;
  const weight01 = round4(
    Math.min(0.1, (args.commerceIdentity?.regionalCalibration.calibration01 ?? 0.25) * 0.35)
  );
  return { regionLabel, weight01 };
}

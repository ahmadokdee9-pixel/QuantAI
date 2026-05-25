/**
 * Phase 17 — Regional emotional commerce adaptation.
 */

import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function adaptRegionalEmotionalCommerce(args: {
  query: string;
  commerceIdentity?: AutonomousCommerceIdentityResult | null;
}): { regionLabel: string; weight01: number } {
  const q = args.query.toLowerCase();
  let regionLabel = args.commerceIdentity?.regionalCalibration.regionLabel ?? "global_neutral";
  if (/\b(uk|british|london)\b/.test(q)) regionLabel = "uk_emotional_norm";
  if (/\b(us|american|usa)\b/.test(q)) regionLabel = "us_emotional_norm";
  if (/\b(eu|european|paris|milan)\b/.test(q)) regionLabel = "eu_emotional_norm";
  const weight01 = round4(
    Math.min(1, 0.25 + (args.commerceIdentity?.regionalCalibration.calibration01 ?? 0.2))
  );
  return { regionLabel, weight01 };
}

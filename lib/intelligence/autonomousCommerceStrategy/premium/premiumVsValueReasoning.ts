/**
 * Phase 15 — Premium vs value reasoning.
 */

import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function reasonPremiumVsValue(commerceIdentity?: AutonomousCommerceIdentityResult | null): {
  reasoning: string;
  premiumBias01: number;
} {
  const band = commerceIdentity?.luxuryModel.band ?? "balanced";
  const premiumBias01 = round4(commerceIdentity?.luxuryModel.score01 ?? 0.35);
  const reasoning =
    band === "luxury" || band === "premium"
      ? "premium_bias_shadow"
      : band === "value"
        ? "value_bias_shadow"
        : "balanced_premium_value";
  return { reasoning, premiumBias01 };
}

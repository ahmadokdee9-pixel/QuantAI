/**
 * Phase 15 — Trust / value / risk balancing.
 */

import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function balanceTrustValueRisk(args: {
  trust?: TrustEngineResult | null;
  commerceIdentity?: AutonomousCommerceIdentityResult | null;
}): { trust01: number; value01: number; risk01: number; balance01: number } {
  const alerts = args.trust?.meta.fakeDiscountAlertCount ?? 0;
  const trust01 = round4(clamp01(1 - alerts / 8));
  const value01 = round4(args.commerceIdentity?.tasteFingerprint.value01 ?? 0.4);
  const risk01 = round4(clamp01(alerts / 6 + (1 - trust01) * 0.35));
  const balance01 = round4(clamp01(trust01 * 0.45 + value01 * 0.35 + (1 - risk01) * 0.2));
  return { trust01, value01, risk01, balance01 };
}

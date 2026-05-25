/**
 * Phase 17 — Aesthetic identity modeling.
 */

import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function modelAestheticIdentity(args: {
  query: string;
  commerceIdentity?: AutonomousCommerceIdentityResult | null;
}): { minimalist01: number; maximalist01: number; label: string } {
  const q = args.query.toLowerCase();
  let minimalist01 = 1 - (args.commerceIdentity?.tasteFingerprint.aesthetic01 ?? 0.35);
  let maximalist01 = args.commerceIdentity?.tasteFingerprint.aesthetic01 ?? 0.35;
  if (/\b(minimal|clean|neutral)\b/.test(q)) minimalist01 = round4(clamp01(minimalist01 + 0.25));
  if (/\b(bold|maximal|loud)\b/.test(q)) maximalist01 = round4(clamp01(maximalist01 + 0.25));
  const label =
    minimalist01 > maximalist01 + 0.15
      ? "minimalist_identity"
      : maximalist01 > minimalist01 + 0.15
        ? "maximalist_identity"
        : "balanced_aesthetic";
  return { minimalist01: round4(minimalist01), maximalist01: round4(maximalist01), label };
}

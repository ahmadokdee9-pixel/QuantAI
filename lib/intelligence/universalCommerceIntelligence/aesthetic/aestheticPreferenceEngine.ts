/**
 * Phase 16 — Aesthetic-aware commerce modeling.
 */

import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";
import type { UniversalVerticalId } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function modelAestheticPreference(args: {
  query: string;
  dominantVertical: UniversalVerticalId;
  commerceIdentity?: AutonomousCommerceIdentityResult | null;
}): { aesthetic01: number; label: string } {
  const q = args.query.toLowerCase();
  let aesthetic01 = args.commerceIdentity?.tasteFingerprint.aesthetic01 ?? 0.35;
  if (/\b(minimal|scandi|clean|modern)\b/.test(q)) aesthetic01 += 0.2;
  if (/\b(bold|streetwear|vintage)\b/.test(q)) aesthetic01 += 0.15;
  if (args.dominantVertical === "fashion" || args.dominantVertical === "luxury") aesthetic01 += 0.1;
  aesthetic01 = round4(Math.min(1, aesthetic01));
  const label = aesthetic01 > 0.55 ? "aesthetic_forward" : aesthetic01 > 0.3 ? "aesthetic_neutral" : "utility_first";
  return { aesthetic01, label };
}

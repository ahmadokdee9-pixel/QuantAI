/**
 * Phase 6 — Memory stability tracker (preference consistency over session).
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { TasteSensitivityProfile } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function trackMemoryStability(args: {
  sessionMemory: CommerceSessionMemoryV1;
  sensitivity: TasteSensitivityProfile;
}): number {
  const brandStability = args.sessionMemory.preferredBrands.length > 0 ? 0.7 : 0.35;
  const categorySpread = Object.keys(args.sessionMemory.categoryAffinity).length;
  const categoryStability = categorySpread <= 3 ? 0.75 : categorySpread <= 6 ? 0.55 : 0.4;
  const aestheticStability = args.sensitivity.aestheticConsistency01;
  const interactionBoost = Math.min(0.2, args.sessionMemory.interactionCount / 50);

  return round4(
    clamp01(brandStability * 0.35 + categoryStability * 0.3 + aestheticStability * 0.25 + interactionBoost)
  );
}

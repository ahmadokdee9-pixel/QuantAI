/**
 * Phase 10 — Evolving taste shift detection (cross-session).
 */

import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { EvolvingTasteProfile } from "../types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function detectEvolvingTasteShift(args: {
  sessionMemory: CommerceSessionMemoryV1;
  memoryResult?: CommerceMemoryResult | null;
}): EvolvingTasteProfile {
  const taste = args.memoryResult?.canonicalTaste;
  const styleCount = args.sessionMemory.styleTags.length + args.sessionMemory.aestheticsRecurring.length;
  const tasteDrift01 = round4(clamp01(styleCount / 12 * 0.6 + (taste?.aestheticProfile.luxury01 ?? 0.2) * 0.4));
  const premiumDrift01 = round4(
    clamp01((taste?.premiumIntent.premiumPreference01 ?? 0.3) - 0.3 + args.sessionMemory.interactionCount / 20)
  );
  const valueDrift01 = round4(taste?.pricingBehavior.dealSeeking01 ?? 0.35);
  const aestheticShift01 = round4(
    clamp01(
      Math.abs((taste?.aestheticProfile.minimalist01 ?? 0.2) - (taste?.aestheticProfile.luxury01 ?? 0.2))
    )
  );
  return { tasteDrift01, premiumDrift01, valueDrift01, aestheticShift01 };
}

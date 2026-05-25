/**
 * Phase 13 — Persistent taste fingerprinting (deterministic).
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function buildPersistentTasteFingerprint(args: {
  sessionMemory: CommerceSessionMemoryV1;
  memory?: CommerceMemoryResult | null;
}): { fingerprintId: string; premium01: number; value01: number; aesthetic01: number } {
  const taste = args.memory?.canonicalTaste;
  const premium01 = round4(clamp01(taste?.premiumIntent.premiumPreference01 ?? 0.35));
  const value01 = round4(clamp01(taste?.pricingBehavior.dealSeeking01 ?? 0.4));
  const aesthetic01 = round4(
    clamp01(
      ((taste?.aestheticProfile.luxury01 ?? 0.3) + (taste?.aestheticProfile.minimalist01 ?? 0.25)) / 2
    )
  );
  const styleSig = args.sessionMemory.styleTags.slice(0, 4).join(",");
  const fingerprintId = `taste_${fnv1aHex(`${styleSig}~${premium01}~${value01}`)}`;
  return { fingerprintId, premium01, value01, aesthetic01 };
}

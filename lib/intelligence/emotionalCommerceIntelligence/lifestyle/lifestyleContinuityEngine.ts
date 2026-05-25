/**
 * Phase 17 — Lifestyle continuity engine.
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function measureLifestyleContinuity(sessionMemory: CommerceSessionMemoryV1): {
  continuity01: number;
} {
  const depth =
    sessionMemory.styleTags.length +
    sessionMemory.emotionalToneTags.length +
    sessionMemory.preferredBrands.length;
  return { continuity01: round4(Math.min(1, depth / 15)) };
}

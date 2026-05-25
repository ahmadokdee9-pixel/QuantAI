/**
 * Phase 13 — Bounded identity evolution tracker.
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function trackBoundedIdentityEvolution(sessionMemory: CommerceSessionMemoryV1): {
  evolutionDelta01: number;
  bounded: true;
} {
  const depth = sessionMemory.interactionCount + sessionMemory.preferredBrands.length;
  const evolutionDelta01 = round4(Math.min(0.25, depth / 80));
  return { evolutionDelta01, bounded: true };
}

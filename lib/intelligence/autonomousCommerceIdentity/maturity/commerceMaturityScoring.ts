/**
 * Phase 13 — Commerce maturity scoring.
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function scoreCommerceMaturity(sessionMemory: CommerceSessionMemoryV1): {
  maturity01: number;
  label: string;
} {
  const interactions = sessionMemory.interactionCount;
  const brandDepth = sessionMemory.preferredBrands.length;
  const maturity01 = round4(
    clamp01(interactions / 25 + brandDepth / 12 + Object.keys(sessionMemory.categoryAffinity).length / 10)
  );
  const label =
    maturity01 > 0.65 ? "established" : maturity01 > 0.35 ? "developing" : "nascent";
  return { maturity01, label };
}

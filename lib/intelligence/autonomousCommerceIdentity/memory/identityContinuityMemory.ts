/**
 * Phase 13 — Identity continuity memory (bounded, input-derived).
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

const MAX_SLOTS = 8;

export type IdentityContinuityMemory = {
  memoryKey: string;
  slotCount: number;
  continuityLabels: string[];
};

export function buildIdentityContinuityMemory(sessionMemory: CommerceSessionMemoryV1): IdentityContinuityMemory {
  const labels: string[] = [];
  if (sessionMemory.preferredBrands.length > 0) labels.push("brand_continuity");
  if (sessionMemory.styleTags.length > 0) labels.push("style_continuity");
  if (Object.keys(sessionMemory.categoryAffinity).length > 0) labels.push("category_continuity");
  if (sessionMemory.interactionCount > 2) labels.push("session_depth");
  labels.push("persona_continuity");

  const memoryKey = `icm_${fnv1aHex(
    `${sessionMemory.interactionCount}~${sessionMemory.preferredBrands.slice(0, 3).join(",")}`
  )}`;

  return {
    memoryKey,
    slotCount: Math.min(MAX_SLOTS, labels.length),
    continuityLabels: labels.slice(0, MAX_SLOTS),
  };
}

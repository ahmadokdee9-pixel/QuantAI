/**
 * Phase 17 — Aesthetic continuity memory (read-only).
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function readAestheticContinuity(args: {
  sessionMemory: CommerceSessionMemoryV1;
  memory?: CommerceMemoryResult | null;
}): { continuity01: number; tags: string[] } {
  const tags = [
    ...args.sessionMemory.aestheticsRecurring.slice(0, 4),
    ...args.sessionMemory.styleTags.slice(0, 4),
  ];
  const memoryDepth =
    Object.keys(args.memory?.canonicalTaste.categoryPreferences ?? {}).length +
    (args.memory?.meta.graph.tasteNodes ?? 0);
  const continuity01 = round4(
    Math.min(1, tags.length / 8 + memoryDepth / 20 + args.sessionMemory.interactionCount / 40)
  );
  return { continuity01, tags: tags.slice(0, 6) };
}

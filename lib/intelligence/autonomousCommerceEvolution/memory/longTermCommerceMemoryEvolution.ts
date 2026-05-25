/**
 * Phase 18 — Long-term commerce memory evolution (read-only).
 */

import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function evolveLongTermMemory(args: {
  memory?: CommerceMemoryResult | null;
  sessionMemory: CommerceSessionMemoryV1;
}): { memoryEvolution01: number } {
  const depth =
    (args.memory?.meta.memoryNodeCount ?? 0) +
    args.sessionMemory.interactionCount +
    Object.keys(args.memory?.canonicalTaste.categoryPreferences ?? {}).length;
  return { memoryEvolution01: round4(Math.min(0.1, depth / 80)) };
}

/**
 * Phase 13 — Deterministic user preference continuity.
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function computePreferenceContinuity(args: {
  sessionMemory: CommerceSessionMemoryV1;
  memory?: CommerceMemoryResult | null;
}): { continuity01: number; decay01: number } {
  const stability = args.memory?.preferenceSignals?.stability01 ?? 0.5;
  const interactions = args.sessionMemory.interactionCount;
  const continuity01 = round4(clamp01(stability * 0.6 + Math.min(0.35, interactions / 30)));
  const decay01 = round4(clamp01(1 - continuity01 * 0.85));
  return { continuity01, decay01 };
}

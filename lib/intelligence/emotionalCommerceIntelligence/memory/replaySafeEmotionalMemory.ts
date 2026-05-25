/**
 * Phase 17 — Replay-safe emotional memory snapshot (no mutation).
 */

import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildReplaySafeEmotionalMemory(args: {
  query: string;
  stylePersonality: string;
  continuity01: number;
}): { memoryKey: string } {
  const memoryKey = `eci_mem_${fnv1aHex(`${args.query}~${args.stylePersonality}~${Math.round(args.continuity01 * 100)}`)}`;
  return { memoryKey };
}

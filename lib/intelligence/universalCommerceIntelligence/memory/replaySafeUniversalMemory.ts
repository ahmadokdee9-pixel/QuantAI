/**
 * Phase 16 — Replay-safe universal cognition memory.
 */

import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";
import type { UniversalVerticalId } from "../types";

export type ReplaySafeUniversalMemory = {
  memoryKey: string;
  dominantVertical: UniversalVerticalId;
};

export function buildReplaySafeUniversalMemory(args: {
  query: string;
  dominantVertical: UniversalVerticalId;
}): ReplaySafeUniversalMemory {
  return {
    memoryKey: `rum_${fnv1aHex(`${args.query.toLowerCase().trim()}~${args.dominantVertical}`)}`,
    dominantVertical: args.dominantVertical,
  };
}

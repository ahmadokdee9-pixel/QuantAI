/**
 * Phase 15 — Replay-safe strategic cognition memory.
 */

import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export type ReplaySafeStrategyMemory = {
  memoryKey: string;
  strategyLabels: string[];
};

export function buildReplaySafeStrategyMemory(args: {
  query: string;
  primaryStrategy: string;
}): ReplaySafeStrategyMemory {
  const q = args.query.toLowerCase().trim();
  return {
    memoryKey: `rsm_${fnv1aHex(`${q}~${args.primaryStrategy}`)}`,
    strategyLabels: [args.primaryStrategy, "shadow_only", "bounded_influence"],
  };
}

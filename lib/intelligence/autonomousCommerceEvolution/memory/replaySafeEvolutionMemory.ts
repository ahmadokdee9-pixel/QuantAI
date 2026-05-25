/**
 * Phase 18 — Replay-safe evolution memory snapshot (no production write).
 */

import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export function buildReplaySafeEvolutionMemory(args: {
  query: string;
  heuristicId: string;
  calibration01: number;
}): { evolutionMemoryKey: string } {
  return {
    evolutionMemoryKey: `ace_mem_${fnv1aHex(`${args.query}~${args.heuristicId}~${Math.round(args.calibration01 * 100)}`)}`,
  };
}

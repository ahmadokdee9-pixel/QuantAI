/**
 * Phase 14 — Replay-safe predictive memory (input-derived).
 */

import { fnv1aHex } from "@/lib/intelligence/normalization/canonicalId";

export type ReplaySafePredictiveMemory = {
  memoryKey: string;
  horizonSlots: string[];
};

export function buildReplaySafePredictiveMemory(args: {
  query: string;
  interactionCount: number;
}): ReplaySafePredictiveMemory {
  const q = args.query.toLowerCase().trim();
  const horizons: string[] = ["session"];
  if (/\b(now|today|urgent)\b/.test(q)) horizons.unshift("immediate");
  if (/\b(season|holiday)\b/.test(q)) horizons.push("seasonal");
  if (/\b(replace|upgrade cycle)\b/.test(q)) horizons.push("replacement");
  return {
    memoryKey: `rpm_${fnv1aHex(`${q}~${args.interactionCount}`)}`,
    horizonSlots: horizons.slice(0, 6),
  };
}

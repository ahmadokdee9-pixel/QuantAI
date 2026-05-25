/**
 * Phase 14 — Replacement cycle prediction.
 */

import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function predictReplacementCycle(args: {
  query: string;
  evolution?: CommerceEvolutionResult | null;
}): { cycle01: number; windowLabel: string } {
  const q = args.query.toLowerCase();
  const cycle01 = round4(args.evolution?.lifecycle.replacementCycle01 ?? 0.2);
  const windowLabel = /\b(replace|upgrade|older|broken)\b/.test(q)
    ? "replacement_window_open"
    : cycle01 > 0.45
      ? "replacement_likely"
      : "replacement_distant";
  return { cycle01, windowLabel };
}

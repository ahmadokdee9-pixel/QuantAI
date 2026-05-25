/**
 * Phase 12 — Demand-shift / demand migration tracker.
 */

import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function trackDemandMigration(args: {
  query: string;
  evolution?: CommerceEvolutionResult | null;
}): { shift01: number; direction: "up" | "down" | "stable" } {
  const q = args.query.toLowerCase();
  let shift01 = args.evolution?.intentTransition.transitionStrength01 ?? 0.2;

  if (/\b(upgrade|newer|replace|switch)\b/.test(q)) shift01 = round4(clamp01(shift01 + 0.35));
  if (/\b(cheaper|budget|value|deal)\b/.test(q)) shift01 = round4(clamp01(shift01 + 0.2));
  if (/\b(decline|less demand|oversupply)\b/.test(q)) shift01 = round4(clamp01(shift01 - 0.25));

  const direction: "up" | "down" | "stable" =
    shift01 > 0.55 ? "up" : shift01 < 0.28 ? "down" : "stable";
  return { shift01: round4(clamp01(shift01)), direction };
}

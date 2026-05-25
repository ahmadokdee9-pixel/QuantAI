/**
 * Phase 12 — Lifecycle wave intelligence.
 */

import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function resolveLifecycleWave(evolution?: CommerceEvolutionResult | null): {
  wave01: number;
  phase: string;
} {
  const lifecycle = evolution?.lifecycle;
  const wave01 = round4(
    clamp01(
      (lifecycle?.lifecycleMaturity01 ?? 0.2) * 0.5 +
        (lifecycle?.timingSensitivity01 ?? 0.2) * 0.3 +
        (lifecycle?.replacementCycle01 ?? 0.15) * 0.2
    )
  );
  return { wave01, phase: lifecycle?.phase ?? "discovery" };
}

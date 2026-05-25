/**
 * Phase 13 — Lifecycle identity transitions.
 */

import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function trackLifecycleIdentityTransitions(evolution?: CommerceEvolutionResult | null): {
  fromPhase: string;
  toPhase: string;
  strength01: number;
} {
  const phase = evolution?.lifecycle.phase ?? "discovery";
  const intent = evolution?.intentTransition;
  return {
    fromPhase: intent?.fromIntent ?? "neutral",
    toPhase: phase,
    strength01: round4(intent?.transitionStrength01 ?? 0.2),
  };
}

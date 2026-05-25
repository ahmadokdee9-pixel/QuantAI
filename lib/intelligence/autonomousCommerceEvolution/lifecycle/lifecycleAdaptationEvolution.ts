/**
 * Phase 18 — Lifecycle adaptation evolution.
 */

import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";
import type { EmotionalCommerceIntelligenceResult } from "@/lib/intelligence/emotionalCommerceIntelligence/types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function evolveLifecycleAdaptation(args: {
  commerceEvolution?: CommerceEvolutionResult | null;
  emotionalCommerce?: EmotionalCommerceIntelligenceResult | null;
}): { fromPhase: string; toPhase: string; strength01: number } {
  const fromPhase = args.commerceEvolution?.lifecycle.phase ?? "discovery";
  const toPhase = args.emotionalCommerce?.emotionalLifecycle.phase ?? fromPhase;
  const strength01 = round4(
    Math.min(0.1, (args.commerceEvolution?.meta.evolutionConfidence01 ?? 0.3) * 0.2)
  );
  return { fromPhase, toPhase, strength01 };
}

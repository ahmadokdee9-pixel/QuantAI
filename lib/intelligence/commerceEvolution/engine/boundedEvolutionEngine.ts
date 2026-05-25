/**
 * Phase 10 — Bounded deterministic evolution engine.
 */

import type { CommerceEvolutionInput } from "../types";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import { EMPTY_COMMERCE_SESSION_MEMORY } from "@/lib/intelligence/commerceSessionMemory";
import { detectSeasonalCommerceEvolution } from "../market/seasonalCommerceEvolution";
import { adaptMarketTiming } from "../market/marketTimingAdapter";
import { resolveCommerceLifecycle } from "../lifecycle/commerceLifecycleIntelligence";
import { trackIntentTransition } from "../intent/intentTransitionTracker";
import { detectEvolvingTasteShift } from "../taste/evolvingTasteShiftDetector";
import { buildEvolutionMemoryGraph } from "../memory/evolutionMemoryGraph";
import { reasonTemporalRecommendation } from "../temporal/temporalRecommendationReasoning";
import { evaluateEvolutionAdaptationBoundaries } from "../governance/evolutionAdaptationBoundaries";
import { buildShadowEvolutionCandidates } from "../candidates/shadowEvolutionCandidates";
import { buildEvolutionExplainability } from "../explain/evolutionExplainability";

export type BoundedEvolutionEngineResult = {
  seasonal: ReturnType<typeof detectSeasonalCommerceEvolution>;
  lifecycle: ReturnType<typeof resolveCommerceLifecycle>;
  intentTransition: ReturnType<typeof trackIntentTransition>;
  tasteEvolution: ReturnType<typeof detectEvolvingTasteShift>;
  memoryGraph: ReturnType<typeof buildEvolutionMemoryGraph>;
  temporal: ReturnType<typeof reasonTemporalRecommendation>;
  timing: ReturnType<typeof adaptMarketTiming>;
  governance: ReturnType<typeof evaluateEvolutionAdaptationBoundaries>;
  shadowCandidates: ReturnType<typeof buildShadowEvolutionCandidates>;
  explain: ReturnType<typeof buildEvolutionExplainability>;
  evolutionConfidence01: number;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function runBoundedEvolutionEngine(
  input: CommerceEvolutionInput,
  sessionMemory: CommerceSessionMemoryV1 = input.sessionMemory ?? EMPTY_COMMERCE_SESSION_MEMORY
): BoundedEvolutionEngineResult {
  const seasonal = detectSeasonalCommerceEvolution(input.query);
  const lifecycle = resolveCommerceLifecycle({
    query: input.query,
    sessionMemory,
    recommendationResult: input.recommendationResult,
  });
  const intentTransition = trackIntentTransition({
    query: input.query,
    sessionMemory,
    recommendationResult: input.recommendationResult,
  });
  const tasteEvolution = detectEvolvingTasteShift({ sessionMemory, memoryResult: input.memoryResult });
  const memoryGraph = buildEvolutionMemoryGraph({
    sessionMemory,
    lifecycle,
    intentTransition,
    tasteEvolution,
  });
  const timing = adaptMarketTiming({ seasonal, commerceOs: input.commerceOsResult });
  const temporal = reasonTemporalRecommendation({
    lifecycle,
    seasonal,
    recommendationResult: input.recommendationResult,
    timingScore01: timing.timingScore01,
  });
  const evolutionConfidence01 = round4(
    temporal.adaptationConfidence01 * 0.4 +
      lifecycle.lifecycleMaturity01 * 0.25 +
      intentTransition.transitionStrength01 * 0.2 +
      (1 - tasteEvolution.tasteDrift01) * 0.15
  );
  const governance = evaluateEvolutionAdaptationBoundaries({
    activationResult: input.activationResult,
    evolutionConfidence01,
    tasteDrift01: tasteEvolution.tasteDrift01,
  });
  const shadowCandidates = buildShadowEvolutionCandidates({
    temporal,
    governance,
    lifecyclePhase: lifecycle.phase,
  });
  const explain = buildEvolutionExplainability({
    seasonal,
    lifecycle,
    intentTransition,
    tasteEvolution,
    temporal,
    timingLabel: timing.timingLabel,
  });

  return {
    seasonal,
    lifecycle,
    intentTransition,
    tasteEvolution,
    memoryGraph,
    temporal,
    timing,
    governance,
    shadowCandidates,
    explain,
    evolutionConfidence01,
  };
}

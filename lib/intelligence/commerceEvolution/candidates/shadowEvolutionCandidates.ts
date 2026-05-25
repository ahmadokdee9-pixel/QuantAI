/**
 * Phase 10 — Shadow evolution candidates (no ranking mutation).
 */

import type { TemporalReasoningResult } from "../temporal/temporalRecommendationReasoning";
import type { ShadowEvolutionCandidate } from "../types";
import type { EvolutionAdaptationVerdict } from "../governance/evolutionAdaptationBoundaries";

const MAX_CANDIDATES = 8;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildShadowEvolutionCandidates(args: {
  temporal: TemporalReasoningResult;
  governance: EvolutionAdaptationVerdict;
  lifecyclePhase: string;
}): ShadowEvolutionCandidate[] {
  if (!args.governance.allowed) return [];

  const candidates: ShadowEvolutionCandidate[] = [
    {
      horizon: args.temporal.horizon === "immediate" ? "session" : args.temporal.horizon,
      adaptationId: `adapt_${args.lifecyclePhase}_${args.temporal.horizon}`,
      confidence01: round4(args.temporal.adaptationConfidence01),
      rankingMutation: false,
    },
  ];

  if (args.temporal.horizon === "replacement_cycle") {
    candidates.push({
      horizon: "replacement_cycle",
      adaptationId: "adapt_replacement_timing",
      confidence01: round4(args.temporal.adaptationConfidence01 * 0.9),
      rankingMutation: false,
    });
  }

  return candidates.slice(0, MAX_CANDIDATES);
}

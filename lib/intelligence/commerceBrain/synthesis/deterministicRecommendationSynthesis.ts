/**
 * Phase 11 — Deterministic recommendation synthesis (shadow only).
 */

import type { CommerceBrainInput, SynthesizedRecommendation } from "../types";
import type { BrainArbitrationVerdict } from "../types";
import type { TemporalTrustTasteFusion } from "../fusion/temporalTrustTasteFusion";

const MAX_CANDIDATES = 6;
const MAX_INFLUENCE_CAP = 0.15;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function synthesizeDeterministicRecommendation(args: {
  input: CommerceBrainInput;
  arbitration: BrainArbitrationVerdict;
  fusion: TemporalTrustTasteFusion;
  brainConfidence01: number;
  maxInfluence01: number;
  governanceAllowed: boolean;
}): SynthesizedRecommendation {
  const recCandidates = args.input.recommendation?.shadowCandidates ?? [];
  const evoCandidates = args.input.evolution?.shadowCandidates ?? [];
  const links = [
    ...recCandidates.map((c) => c.link),
    ...args.input.products.slice(0, 3).map((p) => p.link),
  ];
  const uniqueLinks = [...new Set(links)].slice(0, MAX_CANDIDATES);

  const confidence01 = round4(
    clamp01(
      args.brainConfidence01 * 0.4 +
        args.fusion.fusedScore01 * 0.35 +
        args.arbitration.arbitrationScore01 * 0.25
    )
  );
  const maxInfluence01 = args.governanceAllowed
    ? round4(Math.min(args.maxInfluence01, MAX_INFLUENCE_CAP, confidence01 * args.maxInfluence01))
    : 0;

  return {
    synthesisId: `syn_${args.arbitration.primaryLayer}_${evoCandidates[0]?.adaptationId ?? "session"}`,
    confidence01,
    maxInfluence01,
    candidateLinks: uniqueLinks,
    rankingMutation: false,
  };
}

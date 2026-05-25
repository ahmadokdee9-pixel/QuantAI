/**
 * Phase 18 — Bounded shadow evolution candidates.
 */

import type { EvolutionAxisId, FusedEvolutionSignal, ShadowEvolutionCandidate } from "../types";
import type { EvolutionGovernanceVerdict } from "../governance/evolutionGovernanceVeto";

const MAX = 8;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildShadowEvolutionCandidates(args: {
  fusedSignals: FusedEvolutionSignal[];
  governance: EvolutionGovernanceVerdict;
  maxInfluence01: number;
}): ShadowEvolutionCandidate[] {
  if (!args.governance.allowed) return [];

  return args.fusedSignals
    .filter((s) => s.trustAdjusted01 > 0.2)
    .slice(0, MAX)
    .map((s, i) => ({
      candidateId: `ace_cand_${s.axisId}_${i}`,
      axisId: s.axisId as EvolutionAxisId,
      confidence01: round4(s.trustAdjusted01),
      maxInfluence01: round4(Math.min(args.maxInfluence01, 0.08)),
      rankingMutation: false as const,
    }));
}

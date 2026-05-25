/**
 * Phase 17 — Bounded shadow emotional candidates.
 */

import type { EmotionalAxisId, ShadowEmotionalCandidate } from "../types";
import type { EmotionalGovernanceVerdict } from "../governance/emotionalGovernanceVeto";
import type { FusedEmotionalSignal } from "../types";

const MAX = 8;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildShadowEmotionalCandidates(args: {
  fusedSignals: FusedEmotionalSignal[];
  governance: EmotionalGovernanceVerdict;
  maxInfluence01: number;
}): ShadowEmotionalCandidate[] {
  if (!args.governance.allowed) return [];

  return args.fusedSignals
    .filter((s) => s.trustAdjusted01 > 0.22)
    .slice(0, MAX)
    .map((s, i) => ({
      candidateId: `eci_cand_${s.axisId}_${i}`,
      axisId: s.axisId as EmotionalAxisId,
      confidence01: round4(s.trustAdjusted01),
      maxInfluence01: round4(Math.min(args.maxInfluence01, 0.08)),
      rankingMutation: false as const,
    }));
}

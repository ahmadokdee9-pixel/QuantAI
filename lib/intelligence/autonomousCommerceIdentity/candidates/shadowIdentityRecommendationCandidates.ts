/**
 * Phase 13 — Shadow identity recommendation candidates.
 */

import type { FusedIdentitySignal, ShadowIdentityCandidate } from "../types";
import type { IdentityGovernanceVerdict } from "../governance/identityArbitration";

const MAX_CANDIDATES = 8;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildShadowIdentityRecommendationCandidates(args: {
  signals: FusedIdentitySignal[];
  governance: IdentityGovernanceVerdict;
  maxInfluence01: number;
}): ShadowIdentityCandidate[] {
  if (!args.governance.allowed) return [];
  return args.signals.slice(0, MAX_CANDIDATES).map((s, i) => ({
    candidateId: `aci_cand_${s.axisId}_${i}`,
    axisId: s.axisId,
    confidence01: round4(s.trustAdjusted01),
    maxInfluence01: round4(Math.min(args.maxInfluence01, s.weight01)),
    rankingMutation: false as const,
  }));
}

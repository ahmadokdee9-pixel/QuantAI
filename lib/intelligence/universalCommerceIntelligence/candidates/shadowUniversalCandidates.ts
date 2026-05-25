/**
 * Phase 16 — Bounded shadow universal candidates.
 */

import type { ShadowUniversalCandidate, UniversalVerticalId } from "../types";
import type { CognitionGovernanceVerdict } from "../governance/cognitionArbitration";

const MAX = 8;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildShadowUniversalCandidates(args: {
  dominantVertical: UniversalVerticalId;
  verticalScores: Record<UniversalVerticalId, { score01: number; active: boolean }>;
  governance: CognitionGovernanceVerdict;
  maxInfluence01: number;
}): ShadowUniversalCandidate[] {
  if (!args.governance.allowed) return [];

  const entries = (Object.entries(args.verticalScores) as [UniversalVerticalId, { score01: number }][])
    .filter(([, v]) => v.score01 > 0.22)
    .sort((a, b) => b[1].score01 - a[1].score01)
    .slice(0, MAX);

  return entries.map(([verticalId, v], i) => ({
    candidateId: `uci_cand_${verticalId}_${i}`,
    verticalId,
    confidence01: round4(v.score01),
    maxInfluence01: round4(Math.min(args.maxInfluence01, 0.08)),
    rankingMutation: false as const,
  }));
}

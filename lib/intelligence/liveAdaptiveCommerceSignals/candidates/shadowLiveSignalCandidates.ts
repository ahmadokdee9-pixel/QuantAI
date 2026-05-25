/**
 * Phase 12 — Shadow live signal candidates (no ranking mutation).
 */

import type { FusedLiveSignal, ShadowLiveSignalCandidate } from "../types";
import type { LiveSignalGovernanceVerdict } from "../governance/governanceSignalArbitration";

const MAX_CANDIDATES = 8;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildShadowLiveSignalCandidates(args: {
  signals: FusedLiveSignal[];
  governance: LiveSignalGovernanceVerdict;
  maxInfluence01: number;
}): ShadowLiveSignalCandidate[] {
  if (!args.governance.allowed) return [];

  return args.signals.slice(0, MAX_CANDIDATES).map((s, i) => ({
    candidateId: `lcs_cand_${s.signalId}_${i}`,
    signalId: s.signalId,
    confidence01: round4(s.trustAdjusted01),
    maxInfluence01: round4(Math.min(args.maxInfluence01, s.weight01)),
    rankingMutation: false as const,
  }));
}

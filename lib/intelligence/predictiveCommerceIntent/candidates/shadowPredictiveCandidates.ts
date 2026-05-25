/**
 * Phase 14 — Shadow predictive candidates.
 */

import type { FusedPredictionSignal, ShadowPredictiveCandidate } from "../types";
import type { PredictionGovernanceVerdict } from "../governance/predictionArbitration";

const MAX = 8;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildShadowPredictiveCandidates(args: {
  signals: FusedPredictionSignal[];
  governance: PredictionGovernanceVerdict;
  maxInfluence01: number;
}): ShadowPredictiveCandidate[] {
  if (!args.governance.allowed) return [];
  return args.signals.slice(0, MAX).map((s, i) => ({
    candidateId: `pci_cand_${s.axisId}_${i}`,
    axisId: s.axisId,
    confidence01: round4(s.trustAdjusted01),
    maxInfluence01: round4(Math.min(args.maxInfluence01, s.weight01)),
    rankingMutation: false as const,
  }));
}

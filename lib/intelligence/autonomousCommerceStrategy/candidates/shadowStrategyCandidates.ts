/**
 * Phase 15 — Shadow strategy candidates.
 */

import type { FusedStrategySignal, ShadowStrategyCandidate } from "../types";
import type { StrategyGovernanceVerdict } from "../governance/strategyArbitration";

const MAX = 8;

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function buildShadowStrategyCandidates(args: {
  signals: FusedStrategySignal[];
  governance: StrategyGovernanceVerdict;
  maxInfluence01: number;
}): ShadowStrategyCandidate[] {
  if (!args.governance.allowed) return [];
  return args.signals.slice(0, MAX).map((s, i) => ({
    candidateId: `acs_cand_${s.axisId}_${i}`,
    axisId: s.axisId,
    confidence01: round4(s.trustAdjusted01),
    maxInfluence01: round4(Math.min(args.maxInfluence01, s.weight01)),
    rankingMutation: false as const,
  }));
}

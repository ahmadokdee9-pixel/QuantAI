/**
 * P6.3 — Strategic ranking guards (continuity, inflation, trust dominance).
 */

import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { StrategicBalancePairs } from "@/lib/strategicRanking/strategicRankingBalances";

export type StrategicRankingGuards = {
  rankingContinuity: number;
  inflationGuardActive: boolean;
  trustDominanceGuardActive: boolean;
  inflationScore: number;
  trustDominanceScore: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function evaluateStrategicRankingGuards(args: {
  multiObjective: MultiObjectiveCommerceMeta;
  balances: StrategicBalancePairs;
  projectedDelta: number;
  maxDelta: number;
}): StrategicRankingGuards {
  const { multiObjective, balances, projectedDelta, maxDelta } = args;

  const rankingContinuity = round3(
    clamp(
      (multiObjective.analytics?.continuityAnalytics ?? 0) * 0.01 * 0.35 +
        (multiObjective.analytics?.replayIntegrityAnalytics ?? 0) * 0.01 * 0.35 +
        balances.conversionStabilityBalance * 0.3,
      0,
      1
    )
  );

  const inflationScore = round3(projectedDelta / Math.max(maxDelta, 0.001));
  const inflationGuardActive = inflationScore >= 0.85 || multiObjective.multiObjectiveDelta >= maxDelta * 0.9;

  const trustDominanceScore = round3(
    clamp((multiObjective.trustObjective ?? 0) - (multiObjective.qualityObjective ?? 0) * 0.5 - balances.trustValueBalance * 0.2, 0, 1)
  );
  const trustDominanceGuardActive = trustDominanceScore >= 0.45 && (multiObjective.trustObjective ?? 0) >= 0.55;

  return {
    rankingContinuity,
    inflationGuardActive,
    trustDominanceGuardActive,
    inflationScore,
    trustDominanceScore,
  };
}

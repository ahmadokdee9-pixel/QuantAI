/**
 * P6.3 — Unified strategic ranking state synthesis.
 */

import type { StrategicBalancePairs } from "@/lib/strategicRanking/strategicRankingBalances";
import type { StrategicRankingGuards } from "@/lib/strategicRanking/strategicRankingGuards";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";

export type UnifiedStrategicRankingState = {
  trustValueBalance: number;
  premiumAffordabilityBalance: number;
  conversionStabilityBalance: number;
  aestheticPracticalityBalance: number;
  rankingContinuity: number;
  strategicHarmony: number;
  trustObjective: number;
  valueObjective: number;
  conversionObjective: number;
  stabilityObjective: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function synthesizeUnifiedStrategicRankingState(args: {
  multiObjective: MultiObjectiveCommerceMeta;
  balances: StrategicBalancePairs;
  guards: StrategicRankingGuards;
}): UnifiedStrategicRankingState {
  const { multiObjective, balances, guards } = args;
  const pairs = [
    balances.trustValueBalance,
    balances.premiumAffordabilityBalance,
    balances.conversionStabilityBalance,
    balances.aestheticPracticalityBalance,
  ];
  const mean = pairs.reduce((s, v) => s + v, 0) / pairs.length;
  const strategicHarmony = round3(clamp(mean * 0.7 + guards.rankingContinuity * 0.3, 0, 1));

  return {
    trustValueBalance: balances.trustValueBalance,
    premiumAffordabilityBalance: balances.premiumAffordabilityBalance,
    conversionStabilityBalance: balances.conversionStabilityBalance,
    aestheticPracticalityBalance: balances.aestheticPracticalityBalance,
    rankingContinuity: guards.rankingContinuity,
    strategicHarmony,
    trustObjective: multiObjective.trustObjective ?? 0,
    valueObjective: multiObjective.valueObjective ?? 0,
    conversionObjective: multiObjective.conversionObjective ?? 0,
    stabilityObjective: multiObjective.stabilityObjective ?? 0,
  };
}

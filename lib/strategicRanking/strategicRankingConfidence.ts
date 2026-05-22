/**
 * P6.3 — Strategic ranking confidence + signal bundle.
 */

import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { StrategicRankingContradictionResult } from "@/lib/strategicRanking/strategicRankingContradictions";
import type { UnifiedStrategicRankingState } from "@/lib/strategicRanking/strategicRankingFusion";
import type { StrategicRankingGuards } from "@/lib/strategicRanking/strategicRankingGuards";

export type StrategicRankingSignalBundle = {
  trustValueBalance: number;
  premiumAffordabilityBalance: number;
  conversionStabilityBalance: number;
  aestheticPracticalityBalance: number;
  rankingContinuity: number;
  strategicHarmony: number;
  inflationGuardActive: number;
  trustDominanceGuardActive: number;
  signalHash: string;
  graphExecutionHash: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function buildStrategicRankingSignalBundle(args: {
  state: UnifiedStrategicRankingState;
  guards: StrategicRankingGuards;
}): StrategicRankingSignalBundle {
  const core = {
    trustValueBalance: args.state.trustValueBalance,
    premiumAffordabilityBalance: args.state.premiumAffordabilityBalance,
    conversionStabilityBalance: args.state.conversionStabilityBalance,
    aestheticPracticalityBalance: args.state.aestheticPracticalityBalance,
    rankingContinuity: args.state.rankingContinuity,
    strategicHarmony: args.state.strategicHarmony,
    inflationGuardActive: args.guards.inflationGuardActive ? 1 : 0,
    trustDominanceGuardActive: args.guards.trustDominanceGuardActive ? 1 : 0,
  };

  const signalHash = Object.entries(core)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(Number(v) * 1000)}`)
    .join("|");

  const graphExecutionHash = [
    `tv:${core.trustValueBalance}`,
    `pa:${core.premiumAffordabilityBalance}`,
    `cs:${core.conversionStabilityBalance}`,
    `ap:${core.aestheticPracticalityBalance}`,
    `rc:${core.rankingContinuity}`,
  ].join(",");

  return { ...core, signalHash, graphExecutionHash };
}

export function computeStrategicRankingConfidence(args: {
  signals: StrategicRankingSignalBundle;
  multiObjective: MultiObjectiveCommerceMeta;
  intent: IntentCognitionMeta;
  contradictions: StrategicRankingContradictionResult;
  governanceDampen: number;
}): number {
  const { signals, multiObjective, intent, contradictions, governanceDampen } = args;

  const signalConfidence = clamp(
    signals.strategicHarmony * 0.22 +
      signals.rankingContinuity * 0.18 +
      signals.trustValueBalance * 0.12 +
      signals.conversionStabilityBalance * 0.12 +
      (multiObjective.multiObjectiveConfidence ?? 0) * 0.15 +
      (intent.intentConfidence ?? 0) * 0.1 -
      signals.inflationGuardActive * 0.08 -
      signals.trustDominanceGuardActive * 0.07,
    0,
    1
  );

  return round3(clamp((signalConfidence - contradictions.uncertaintyScore * 0.1) * governanceDampen, 0, 1));
}

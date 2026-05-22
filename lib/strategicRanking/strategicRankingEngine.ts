/**
 * P6.3 — Adaptive strategic ranking engine orchestration.
 */

import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import { computeStrategicBalancePairs } from "@/lib/strategicRanking/strategicRankingBalances";
import {
  computeStrategicRankingBalance,
  computeStrategicRankingBlendInfluence,
  type StrategicRankingBalanceResult,
  type StrategicRankingBlendInfluence,
} from "@/lib/strategicRanking/strategicRankingBalancer";
import {
  buildStrategicRankingSignalBundle,
  computeStrategicRankingConfidence,
  type StrategicRankingSignalBundle,
} from "@/lib/strategicRanking/strategicRankingConfidence";
import { detectStrategicRankingContradictions, type StrategicRankingContradictionResult } from "@/lib/strategicRanking/strategicRankingContradictions";
import { synthesizeUnifiedStrategicRankingState } from "@/lib/strategicRanking/strategicRankingFusion";
import { evaluateStrategicRankingGuards } from "@/lib/strategicRanking/strategicRankingGuards";
import type { AdaptiveStrategicRankingProfile } from "@/lib/strategicRanking/strategicRankingProfiles";

export type StrategicRankingEngineResult = {
  signals: StrategicRankingSignalBundle;
  contradictions: StrategicRankingContradictionResult;
  balance: StrategicRankingBalanceResult;
  influence: StrategicRankingBlendInfluence;
  guards: ReturnType<typeof evaluateStrategicRankingGuards>;
  strategicRankingScore: number;
  anomalies: string[];
};

export function runStrategicRankingEngine(args: {
  multiObjective: MultiObjectiveCommerceMeta;
  intent: IntentCognitionMeta;
  governance: IntentGovernanceMeta;
  profile: AdaptiveStrategicRankingProfile;
}): StrategicRankingEngineResult {
  const balances = computeStrategicBalancePairs({ multiObjective: args.multiObjective, intent: args.intent });

  const projectedDelta = args.multiObjective.multiObjectiveDelta ?? 0;
  const guards = evaluateStrategicRankingGuards({
    multiObjective: args.multiObjective,
    balances,
    projectedDelta,
    maxDelta: args.profile.maxDelta,
  });

  const state = synthesizeUnifiedStrategicRankingState({
    multiObjective: args.multiObjective,
    balances,
    guards,
  });

  const signals = buildStrategicRankingSignalBundle({ state, guards });

  const contradictions = detectStrategicRankingContradictions({
    state,
    guards,
    multiObjective: args.multiObjective,
    intent: args.intent,
  });

  let governanceDampen = 1;
  if (args.governance.anomalyDetected) governanceDampen = 0.88;

  const strategicRankingConfidence = computeStrategicRankingConfidence({
    signals,
    multiObjective: args.multiObjective,
    intent: args.intent,
    contradictions,
    governanceDampen,
  });

  const balance = computeStrategicRankingBalance({
    signals,
    strategicRankingConfidence,
    governance: args.governance,
    multiObjective: args.multiObjective,
    intent: args.intent,
    guards,
    contradictions,
    profile: args.profile,
  });

  const influence = computeStrategicRankingBlendInfluence({
    signals,
    state,
    balance,
    profile: args.profile,
  });

  const anomalies: string[] = [];
  if (args.profile.requiresGovernancePass && args.governance.anomalyDetected) anomalies.push("governance_gate");
  if (args.profile.requiresMultiObjectiveStable && !balance.multiObjectiveStable) anomalies.push("multi_objective_unstable");
  if (contradictions.contradictionCount >= 3) anomalies.push("contradiction_escalation");
  if (influence.strategicRankingDelta > args.profile.maxDelta) anomalies.push("delta_exceeded");
  if (guards.inflationGuardActive) anomalies.push("inflation_guard");
  if (guards.trustDominanceGuardActive) anomalies.push("trust_dominance_guard");
  if (strategicRankingConfidence < 0.3) anomalies.push("low_confidence");

  const strategicRankingScore = Math.min(
    100,
    Math.round(balance.balanceScore * 0.45 + strategicRankingConfidence * 35 + (100 - anomalies.length * 10) * 0.15)
  );

  return { signals, contradictions, balance, influence, guards, strategicRankingScore, anomalies };
}

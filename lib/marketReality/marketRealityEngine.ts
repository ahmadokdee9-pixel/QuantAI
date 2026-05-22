/**
 * P6.5 — Market reality intelligence engine orchestration.
 */

import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import {
  computeMarketRealityBalance,
  computeMarketRealityBlendInfluence,
  type MarketRealityBalanceResult,
  type MarketRealityBlendInfluence,
} from "@/lib/marketReality/marketRealityBalancer";
import {
  buildMarketRealitySignalBundle,
  computeMarketRealityConfidence,
  type MarketRealitySignalBundle,
} from "@/lib/marketReality/marketRealityConfidence";
import { detectMarketRealityContradictions, type MarketRealityContradictionResult } from "@/lib/marketReality/marketRealityContradictions";
import { detectMarketRealitySignals, type MarketRealityDetection } from "@/lib/marketReality/marketRealityDetection";
import { synthesizeUnifiedMarketRealityState } from "@/lib/marketReality/marketRealityFusion";
import type { MarketRealityIntelligenceProfile } from "@/lib/marketReality/marketRealityProfiles";
import { computeMarketRealityStabilization } from "@/lib/marketReality/marketRealityStabilization";
import type { QuantProduct } from "@/lib/shoppingScore";

export type MarketRealityEngineResult = {
  signals: MarketRealitySignalBundle;
  detection: MarketRealityDetection;
  contradictions: MarketRealityContradictionResult;
  balance: MarketRealityBalanceResult;
  influence: MarketRealityBlendInfluence;
  realityScore: number;
  anomalies: string[];
};

export function runMarketRealityEngine(args: {
  products: QuantProduct[];
  intent: IntentCognitionMeta;
  multiObjective: MultiObjectiveCommerceMeta;
  strategic: AdaptiveStrategicRankingMeta;
  memoryless: MemorylessCommerceLearningMeta;
  governance: IntentGovernanceMeta;
  profile: MarketRealityIntelligenceProfile;
}): MarketRealityEngineResult {
  const detection = detectMarketRealitySignals({
    products: args.products,
    intent: args.intent,
    multiObjective: args.multiObjective,
    strategic: args.strategic,
    memoryless: args.memoryless,
  });

  const stabilization = computeMarketRealityStabilization({
    products: args.products,
    strategic: args.strategic,
    memoryless: args.memoryless,
    detection,
  });

  const state = synthesizeUnifiedMarketRealityState({ detection, stabilization });
  const signals = buildMarketRealitySignalBundle(state);

  const contradictions = detectMarketRealityContradictions({
    state,
    detection,
    memoryless: args.memoryless,
  });

  let governanceDampen = 1;
  if (args.governance.anomalyDetected) governanceDampen = 0.88;

  const realityConfidence = computeMarketRealityConfidence({
    signals,
    strategic: args.strategic,
    memoryless: args.memoryless,
    detection,
    contradictions,
    governanceDampen,
  });

  const balance = computeMarketRealityBalance({
    signals,
    realityConfidence,
    governance: args.governance,
    memoryless: args.memoryless,
    detection,
    contradictions,
    profile: args.profile,
  });

  const influence = computeMarketRealityBlendInfluence({
    signals,
    detection,
    balance,
    profile: args.profile,
  });

  const anomalies: string[] = [];
  if (args.profile.requiresGovernancePass && args.governance.anomalyDetected) anomalies.push("governance_gate");
  if (args.profile.requiresLearningStable && !balance.learningStable) anomalies.push("learning_unstable");
  if (contradictions.contradictionCount >= 3) anomalies.push("contradiction_escalation");
  if (influence.realityDelta > args.profile.maxDelta) anomalies.push("delta_exceeded");
  if (realityConfidence < 0.3) anomalies.push("low_confidence");

  const realityScore = Math.min(
    100,
    Math.round(balance.balanceScore * 0.45 + realityConfidence * 35 + (100 - anomalies.length * 10) * 0.15)
  );

  return { signals, detection, contradictions, balance, influence, realityScore, anomalies };
}

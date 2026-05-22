/**
 * P6.6 — Commerce decision intelligence engine orchestration.
 */

import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import {
  computeCommerceDecisionBalance,
  computeCommerceDecisionBlendInfluence,
  type CommerceDecisionBalanceResult,
  type CommerceDecisionBlendInfluence,
} from "@/lib/commerceDecision/commerceDecisionBalancer";
import {
  buildCommerceDecisionSignalBundle,
  computeCommerceDecisionConfidence,
  type CommerceDecisionSignalBundle,
} from "@/lib/commerceDecision/commerceDecisionConfidence";
import { detectCommerceDecisionContradictions, type CommerceDecisionContradictionResult } from "@/lib/commerceDecision/commerceDecisionContradictions";
import { detectCommerceDecisionSignals, type CommerceDecisionDetection } from "@/lib/commerceDecision/commerceDecisionDetection";
import { synthesizeUnifiedCommerceDecisionState } from "@/lib/commerceDecision/commerceDecisionFusion";
import type { CommerceDecisionIntelligenceProfile } from "@/lib/commerceDecision/commerceDecisionProfiles";
import { computeCommerceDecisionStabilization } from "@/lib/commerceDecision/commerceDecisionStabilization";
import type { QuantProduct } from "@/lib/shoppingScore";

export type CommerceDecisionEngineResult = {
  signals: CommerceDecisionSignalBundle;
  detection: CommerceDecisionDetection;
  contradictions: CommerceDecisionContradictionResult;
  balance: CommerceDecisionBalanceResult;
  influence: CommerceDecisionBlendInfluence;
  decisionScore: number;
  anomalies: string[];
};

export function runCommerceDecisionEngine(args: {
  products: QuantProduct[];
  intent: IntentCognitionMeta;
  multiObjective: MultiObjectiveCommerceMeta;
  strategic: AdaptiveStrategicRankingMeta;
  memoryless: MemorylessCommerceLearningMeta;
  marketReality: MarketRealityIntelligenceMeta;
  governance: IntentGovernanceMeta;
  profile: CommerceDecisionIntelligenceProfile;
}): CommerceDecisionEngineResult {
  const detection = detectCommerceDecisionSignals({
    products: args.products,
    intent: args.intent,
    multiObjective: args.multiObjective,
    strategic: args.strategic,
    memoryless: args.memoryless,
    marketReality: args.marketReality,
  });

  const stabilization = computeCommerceDecisionStabilization({
    strategic: args.strategic,
    memoryless: args.memoryless,
    marketReality: args.marketReality,
    detection,
  });

  const state = synthesizeUnifiedCommerceDecisionState({ detection, stabilization });
  const signals = buildCommerceDecisionSignalBundle(state);

  const contradictions = detectCommerceDecisionContradictions({
    state,
    detection,
    marketReality: args.marketReality,
  });

  let governanceDampen = 1;
  if (args.governance.anomalyDetected) governanceDampen = 0.88;

  const decisionConfidence = computeCommerceDecisionConfidence({
    signals,
    strategic: args.strategic,
    marketReality: args.marketReality,
    detection,
    contradictions,
    governanceDampen,
  });

  const balance = computeCommerceDecisionBalance({
    signals,
    decisionConfidence,
    governance: args.governance,
    marketReality: args.marketReality,
    detection,
    contradictions,
    profile: args.profile,
  });

  const influence = computeCommerceDecisionBlendInfluence({
    signals,
    detection,
    balance,
    profile: args.profile,
  });

  const anomalies: string[] = [];
  if (args.profile.requiresGovernancePass && args.governance.anomalyDetected) anomalies.push("governance_gate");
  if (args.profile.requiresRealityStable && !balance.realityStable) anomalies.push("reality_unstable");
  if (contradictions.contradictionCount >= 3) anomalies.push("contradiction_escalation");
  if (influence.decisionDelta > args.profile.maxDelta) anomalies.push("delta_exceeded");
  if (decisionConfidence < 0.3) anomalies.push("low_confidence");

  const decisionScore = Math.min(
    100,
    Math.round(balance.balanceScore * 0.45 + decisionConfidence * 35 + (100 - anomalies.length * 10) * 0.15)
  );

  return { signals, detection, contradictions, balance, influence, decisionScore, anomalies };
}

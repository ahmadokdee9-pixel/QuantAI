/**
 * P6.2 — Multi-objective commerce engine orchestration.
 */

import type { BehavioralCommerceMeta } from "@/lib/behavioral/behavioralTelemetry";
import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { MarketIntelligenceMeta } from "@/lib/market/marketTelemetry";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";
import { evaluateAestheticObjective } from "@/lib/multiObjective/multiObjectiveAesthetics";
import {
  computeMultiObjectiveBalance,
  computeMultiObjectiveBlendInfluence,
  type MultiObjectiveBalanceResult,
  type MultiObjectiveBlendInfluence,
} from "@/lib/multiObjective/multiObjectiveBalancer";
import {
  buildMultiObjectiveSignalBundle,
  computeMultiObjectiveConfidence,
  type MultiObjectiveSignalBundle,
} from "@/lib/multiObjective/multiObjectiveConfidence";
import { evaluateConversionObjective } from "@/lib/multiObjective/multiObjectiveConversion";
import { detectMultiObjectiveContradictions, type MultiObjectiveContradictionResult } from "@/lib/multiObjective/multiObjectiveContradictions";
import { synthesizeUnifiedMultiObjectiveState } from "@/lib/multiObjective/multiObjectiveFusion";
import { evaluateIntentObjective } from "@/lib/multiObjective/multiObjectiveIntent";
import { evaluatePriceObjective } from "@/lib/multiObjective/multiObjectivePrice";
import type { MultiObjectiveCommerceProfile } from "@/lib/multiObjective/multiObjectiveProfiles";
import { evaluateQualityObjective } from "@/lib/multiObjective/multiObjectiveQuality";
import { evaluateStabilityObjective } from "@/lib/multiObjective/multiObjectiveStability";
import { evaluateTrustObjective } from "@/lib/multiObjective/multiObjectiveTrust";
import { evaluateValueObjective } from "@/lib/multiObjective/multiObjectiveValue";

export type MultiObjectiveEngineResult = {
  signals: MultiObjectiveSignalBundle;
  contradictions: MultiObjectiveContradictionResult;
  balance: MultiObjectiveBalanceResult;
  influence: MultiObjectiveBlendInfluence;
  multiObjectiveScore: number;
  anomalies: string[];
};

export function runMultiObjectiveEngine(args: {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  decision: DecisionIntelligenceMeta;
  strategy: StrategyIntelligenceMeta;
  market: MarketIntelligenceMeta;
  behavioral: BehavioralCommerceMeta;
  cognition: CognitionEngineMeta;
  intent: IntentCognitionMeta;
  governance: IntentGovernanceMeta;
  profile: MultiObjectiveCommerceProfile;
}): MultiObjectiveEngineResult {
  const quality = evaluateQualityObjective({ decision: args.decision, cognition: args.cognition });
  const price = evaluatePriceObjective({ canonicalQuery: args.canonicalQuery, decision: args.decision, market: args.market });
  const trust = evaluateTrustObjective({ decision: args.decision, strategy: args.strategy, intent: args.intent });
  const value = evaluateValueObjective({ decision: args.decision, strategy: args.strategy, intent: args.intent });
  const intentObj = evaluateIntentObjective(args.intent);
  const aesthetic = evaluateAestheticObjective({ query: args.query, canonicalQuery: args.canonicalQuery, intent: args.intent });
  const stability = evaluateStabilityObjective({ cognition: args.cognition, intent: args.intent, behavioral: args.behavioral });
  const conversion = evaluateConversionObjective({
    behavioral: args.behavioral,
    cognition: args.cognition,
    intent: args.intent,
    strategy: args.strategy,
  });

  const state = synthesizeUnifiedMultiObjectiveState({ quality, price, trust, value, intent: intentObj, aesthetic, stability, conversion });

  const signals = buildMultiObjectiveSignalBundle({ state, intent: args.intent, cognition: args.cognition });

  const contradictions = detectMultiObjectiveContradictions({
    state,
    value,
    intent: args.intent,
    cognition: args.cognition,
  });

  let governanceDampen = 1;
  if (args.governance.anomalyDetected) governanceDampen = 0.88;

  const multiObjectiveConfidence = computeMultiObjectiveConfidence({
    signals,
    intent: args.intent,
    cognition: args.cognition,
    contradictions,
    governanceDampen,
  });

  const balance = computeMultiObjectiveBalance({
    signals,
    multiObjectiveConfidence,
    governance: args.governance,
    intent: args.intent,
    cognition: args.cognition,
    contradictions,
    behavioral: args.behavioral,
    strategy: args.strategy,
    profile: args.profile,
  });

  const influence = computeMultiObjectiveBlendInfluence({ signals, balance, profile: args.profile });

  const anomalies: string[] = [];
  if (args.profile.requiresGovernancePass && args.governance.anomalyDetected) anomalies.push("governance_gate");
  if (args.profile.requiresIntentStable && !balance.intentStable) anomalies.push("intent_unstable");
  if (contradictions.contradictionCount >= 3) anomalies.push("contradiction_escalation");
  if (influence.multiObjectiveDelta > args.profile.maxDelta) anomalies.push("delta_exceeded");
  if (multiObjectiveConfidence < 0.3) anomalies.push("low_confidence");

  const multiObjectiveScore = Math.min(
    100,
    Math.round(balance.balanceScore * 0.45 + multiObjectiveConfidence * 35 + (100 - anomalies.length * 10) * 0.15)
  );

  return { signals, contradictions, balance, influence, multiObjectiveScore, anomalies };
}

/**
 * P6.2 — Multi-objective balancer (routing + bounded influence).
 */

import type { BehavioralCommerceMeta } from "@/lib/behavioral/behavioralTelemetry";
import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MultiObjectiveContradictionResult } from "@/lib/multiObjective/multiObjectiveContradictions";
import type { MultiObjectiveSignalBundle } from "@/lib/multiObjective/multiObjectiveConfidence";
import type { MultiObjectiveRoutingLane } from "@/lib/multiObjective/multiObjectiveFlags";
import type { MultiObjectiveCommerceProfile } from "@/lib/multiObjective/multiObjectiveProfiles";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";

export type MultiObjectiveBalanceResult = {
  routingLane: MultiObjectiveRoutingLane;
  governanceDampen: number;
  intentStable: boolean;
  balanceScore: number;
  multiObjectiveConfidence: number;
};

export type MultiObjectiveBlendInfluence = {
  multiObjectiveDelta: number;
  qualityInfluence: number;
  priceInfluence: number;
  trustInfluence: number;
  valueInfluence: number;
  intentInfluence: number;
  aestheticInfluence: number;
  stabilityInfluence: number;
  conversionInfluence: number;
  continuityStrength: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveMultiObjectiveRoutingLane(args: {
  signals: MultiObjectiveSignalBundle;
  contradictions: MultiObjectiveContradictionResult;
  intent: IntentCognitionMeta;
  cognition: CognitionEngineMeta;
  behavioral: BehavioralCommerceMeta;
  strategy: StrategyIntelligenceMeta;
  governance: IntentGovernanceMeta;
}): MultiObjectiveRoutingLane {
  const { signals, contradictions, intent, cognition, behavioral, strategy, governance } = args;

  if (governance.anomalyDetected || cognition.rollbackTriggered || intent.rollbackTriggered) return "stabilize";
  if (behavioral.rollbackTriggered || strategy.rollbackTriggered) return "replay-protect";
  if (contradictions.contradictionCount >= 2) return "contradiction-check";
  if (behavioral.buyingFriction >= 0.55 || intent.hesitationIntent >= 0.55) return "behavior-check";
  if (intent.comparisonIntent >= 0.5 || intent.routingLane === "compare") return "compare";
  if (signals.conversionObjective < 0.35) return "conversion-check";
  if (strategy.momentumConfidence < 0.25) return "momentum-check";
  if (intent.routingLane === "reinforce") return "reinforce";
  if (intent.routingLane === "strategic-balance") return "strategic-balance";
  if (signals.objectiveBalance >= 0.55 && contradictions.contradictionCount === 0) return "objective-safe";
  return "hold";
}

export function computeMultiObjectiveBalance(args: {
  signals: MultiObjectiveSignalBundle;
  multiObjectiveConfidence: number;
  governance: IntentGovernanceMeta;
  intent: IntentCognitionMeta;
  cognition: CognitionEngineMeta;
  contradictions: MultiObjectiveContradictionResult;
  behavioral: BehavioralCommerceMeta;
  strategy: StrategyIntelligenceMeta;
  profile: MultiObjectiveCommerceProfile;
}): MultiObjectiveBalanceResult {
  const { signals, multiObjectiveConfidence, governance, intent, cognition, contradictions, behavioral, strategy, profile } =
    args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;

  const intentStable =
    !intent.rollbackTriggered &&
    !cognition.rollbackTriggered &&
    (intent.analytics?.replayIntegrityAnalytics ?? 0) >= 50;

  let routingLane = resolveMultiObjectiveRoutingLane({
    signals,
    contradictions,
    intent,
    cognition,
    behavioral,
    strategy,
    governance,
  });

  if (!profile.allowsMutation && routingLane !== "replay-protect" && routingLane !== "stabilize") {
    routingLane = "hold";
  }

  const balanceScore = Math.min(
    100,
    Math.round(
      multiObjectiveConfidence * 40 +
        signals.objectiveBalance * 25 +
        signals.stabilityObjective * 15 +
        (intent.intentScore ?? 0) * 0.1 +
        (cognition.cognitionScore ?? 0) * 0.1
    )
  );

  return {
    routingLane,
    governanceDampen,
    intentStable,
    balanceScore,
    multiObjectiveConfidence,
  };
}

export function computeMultiObjectiveBlendInfluence(args: {
  signals: MultiObjectiveSignalBundle;
  balance: MultiObjectiveBalanceResult;
  profile: MultiObjectiveCommerceProfile;
}): MultiObjectiveBlendInfluence {
  const { signals, balance, profile } = args;
  const damp = balance.governanceDampen;

  const qualityInfluence = clamp(signals.qualityObjective * profile.maxQualityAmplification * damp, 0, profile.maxDelta);
  const priceInfluence = clamp(signals.priceObjective * profile.maxDelta * 0.9 * damp, 0, profile.maxDelta);
  const trustInfluence = clamp(signals.trustObjective * profile.maxTrustAmplification * damp, 0, profile.maxTrustAmplification);
  const valueInfluence = clamp(signals.valueObjective * profile.maxDelta * 0.9 * damp, 0, profile.maxDelta);
  const intentInfluence = clamp(signals.intentObjective * profile.maxDelta * damp, 0, profile.maxDelta);
  const aestheticInfluence = clamp(signals.aestheticObjective * profile.maxDelta * 0.8 * damp, 0, profile.maxDelta);
  const stabilityInfluence = clamp(signals.stabilityObjective * profile.maxDelta * 0.85 * damp, 0, profile.maxDelta);
  const conversionInfluence = clamp(
    signals.conversionObjective * profile.maxConversionAmplification * damp,
    0,
    profile.maxConversionAmplification
  );
  const continuityStrength = clamp(signals.objectiveContinuity * profile.maxDelta * 0.6, 0, profile.maxDelta);

  const laneScale =
    balance.routingLane === "reinforce" || balance.routingLane === "objective-safe"
      ? 1.05
      : balance.routingLane === "strategic-balance"
        ? 1
        : balance.routingLane === "behavior-check" ||
            balance.routingLane === "contradiction-check" ||
            balance.routingLane === "conversion-check" ||
            balance.routingLane === "momentum-check"
          ? 0.75
          : 0.95;

  const multiObjectiveDelta = clamp(
    (qualityInfluence +
      priceInfluence +
      trustInfluence +
      valueInfluence +
      intentInfluence +
      aestheticInfluence +
      stabilityInfluence +
      conversionInfluence +
      continuityStrength) *
      0.07 *
      laneScale,
    0,
    profile.maxDelta
  );

  return {
    multiObjectiveDelta: round3(multiObjectiveDelta),
    qualityInfluence: round3(qualityInfluence),
    priceInfluence: round3(priceInfluence),
    trustInfluence: round3(trustInfluence),
    valueInfluence: round3(valueInfluence),
    intentInfluence: round3(intentInfluence),
    aestheticInfluence: round3(aestheticInfluence),
    stabilityInfluence: round3(stabilityInfluence),
    conversionInfluence: round3(conversionInfluence),
    continuityStrength: round3(continuityStrength),
  };
}

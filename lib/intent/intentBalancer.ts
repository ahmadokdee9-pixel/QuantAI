/**
 * P6.1 — Intent cognition balancer (routing + bounded influence).
 */

import type { BehavioralCommerceMeta } from "@/lib/behavioral/behavioralTelemetry";
import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentContradictionResult } from "@/lib/intent/intentContradictions";
import type { IntentSignalBundle } from "@/lib/intent/intentConfidence";
import type { IntentCognitionProfile } from "@/lib/intent/intentProfiles";
import type { IntentCognitionRoutingLane } from "@/lib/intent/intentFlags";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyTelemetry";

export type IntentBalanceResult = {
  routingLane: IntentCognitionRoutingLane;
  governanceDampen: number;
  cognitionStable: boolean;
  balanceScore: number;
  intentConfidence: number;
};

export type IntentBlendInfluence = {
  intentDelta: number;
  recommendationInfluence: number;
  comparisonInfluence: number;
  premiumInfluence: number;
  valueInfluence: number;
  trustInfluence: number;
  readinessInfluence: number;
  aestheticInfluence: number;
  continuityStrength: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveIntentRoutingLane(args: {
  signals: IntentSignalBundle;
  contradictions: IntentContradictionResult;
  cognition: CognitionEngineMeta;
  behavioral: BehavioralCommerceMeta;
  strategy: StrategyIntelligenceMeta;
  governance: IntentGovernanceMeta;
}): IntentCognitionRoutingLane {
  const { signals, contradictions, cognition, behavioral, strategy, governance } = args;

  if (governance.anomalyDetected || cognition.rollbackTriggered) return "stabilize";
  if (behavioral.rollbackTriggered || strategy.rollbackTriggered) return "replay-protect";
  if (contradictions.contradictionCount >= 2) return "contradiction-check";
  if (behavioral.buyingFriction >= 0.55 || signals.hesitationIntent >= 0.55) return "behavior-check";
  if (signals.comparisonIntent >= 0.5 || strategy.routingLane === "compare") return "compare";
  if (signals.readinessIntent < 0.35) return "conversion-check";
  if (strategy.momentumConfidence < 0.25) return "momentum-check";
  if (strategy.routingLane === "reinforce") return "reinforce";
  if (strategy.routingLane === "strategic-balance") return "strategic-balance";
  if (signals.readinessIntent >= 0.45 && contradictions.contradictionCount === 0) return "intent-safe";
  return "hold";
}

export function computeIntentBalance(args: {
  signals: IntentSignalBundle;
  intentConfidence: number;
  governance: IntentGovernanceMeta;
  cognition: CognitionEngineMeta;
  contradictions: IntentContradictionResult;
  behavioral: BehavioralCommerceMeta;
  strategy: StrategyIntelligenceMeta;
  profile: IntentCognitionProfile;
}): IntentBalanceResult {
  const { signals, intentConfidence, governance, cognition, contradictions, behavioral, strategy, profile } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;

  const cognitionStable = !cognition.rollbackTriggered && cognition.analytics.replayIntegrityAnalytics >= 50;

  let routingLane = resolveIntentRoutingLane({ signals, contradictions, cognition, behavioral, strategy, governance });

  if (!profile.allowsMutation && routingLane !== "replay-protect" && routingLane !== "stabilize") {
    routingLane = "hold";
  }

  const balanceScore = Math.min(
    100,
    Math.round(intentConfidence * 40 + signals.intentContinuity * 25 + cognition.cognitionScore * 0.15 + signals.readinessIntent * 15)
  );

  return {
    routingLane,
    governanceDampen,
    cognitionStable,
    balanceScore,
    intentConfidence,
  };
}

export function computeIntentBlendInfluence(args: {
  signals: IntentSignalBundle;
  balance: IntentBalanceResult;
  profile: IntentCognitionProfile;
}): IntentBlendInfluence {
  const { signals, balance, profile } = args;
  const damp = balance.governanceDampen;

  const recommendationInfluence = clamp(signals.recommendationIntent * profile.maxDelta * damp, 0, profile.maxDelta);
  const comparisonInfluence = clamp(signals.comparisonIntent * profile.maxDelta * damp, 0, profile.maxDelta);
  const premiumInfluence = clamp(signals.premiumIntent * profile.maxDelta * 0.9 * damp, 0, profile.maxDelta);
  const valueInfluence = clamp(signals.valueIntent * profile.maxDelta * 0.9 * damp, 0, profile.maxDelta);
  const trustInfluence = clamp(signals.trustIntent * profile.maxTrustAmplification * damp, 0, profile.maxTrustAmplification);
  const readinessInfluence = clamp(signals.readinessIntent * profile.maxReadinessAmplification * damp, 0, profile.maxReadinessAmplification);
  const aestheticInfluence = clamp(signals.aestheticIntent * profile.maxAestheticAmplification * damp, 0, profile.maxAestheticAmplification);
  const continuityStrength = clamp(signals.intentContinuity * profile.maxDelta * 0.6, 0, profile.maxDelta);

  const laneScale =
    balance.routingLane === "reinforce" || balance.routingLane === "intent-safe"
      ? 1.05
      : balance.routingLane === "strategic-balance"
        ? 1
        : balance.routingLane === "behavior-check" ||
            balance.routingLane === "contradiction-check" ||
            balance.routingLane === "conversion-check" ||
            balance.routingLane === "momentum-check"
          ? 0.75
          : 0.95;

  const intentDelta = clamp(
    (recommendationInfluence +
      comparisonInfluence +
      premiumInfluence +
      valueInfluence +
      trustInfluence +
      readinessInfluence +
      aestheticInfluence +
      continuityStrength) *
      0.08 *
      laneScale,
    0,
    profile.maxDelta
  );

  return {
    intentDelta: round3(intentDelta),
    recommendationInfluence: round3(recommendationInfluence),
    comparisonInfluence: round3(comparisonInfluence),
    premiumInfluence: round3(premiumInfluence),
    valueInfluence: round3(valueInfluence),
    trustInfluence: round3(trustInfluence),
    readinessInfluence: round3(readinessInfluence),
    aestheticInfluence: round3(aestheticInfluence),
    continuityStrength: round3(continuityStrength),
  };
}

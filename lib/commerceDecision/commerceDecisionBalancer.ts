/**
 * P6.6 — Commerce decision balancer (routing + bounded influence).
 */

import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { CommerceDecisionContradictionResult } from "@/lib/commerceDecision/commerceDecisionContradictions";
import type { CommerceDecisionDetection } from "@/lib/commerceDecision/commerceDecisionDetection";
import type { CommerceDecisionSignalBundle } from "@/lib/commerceDecision/commerceDecisionConfidence";
import type { CommerceDecisionRoutingLane } from "@/lib/commerceDecision/commerceDecisionFlags";
import type { CommerceDecisionIntelligenceProfile } from "@/lib/commerceDecision/commerceDecisionProfiles";

export type CommerceDecisionBalanceResult = {
  routingLane: CommerceDecisionRoutingLane;
  governanceDampen: number;
  realityStable: boolean;
  balanceScore: number;
  decisionConfidence: number;
};

export type CommerceDecisionBlendInfluence = {
  decisionDelta: number;
  continuityInfluence: number;
  integrityInfluence: number;
  promotionDampening: number;
  outcomeDampening: number;
  trustValueStabilization: number;
  conversionStabilization: number;
  formationReinforcement: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveCommerceDecisionRoutingLane(args: {
  signals: CommerceDecisionSignalBundle;
  detection: CommerceDecisionDetection;
  contradictions: CommerceDecisionContradictionResult;
  marketReality: MarketRealityIntelligenceMeta;
  governance: IntentGovernanceMeta;
}): CommerceDecisionRoutingLane {
  const { signals, detection, contradictions, marketReality, governance } = args;

  if (governance.anomalyDetected || marketReality.rollbackTriggered) return "stabilize";
  if (marketReality.routingLane === "replay-protect") return "replay-protect";
  if (detection.weakRecommendationStructureDetected) return "recommendation-check";
  if (detection.unstableRecommendationOutcomeDetected) return "outcome-check";
  if (detection.unsafePromotionDominanceDetected) return "promotion-check";
  if (detection.lowConfidencePurchaseDecisionDetected) return "purchase-check";
  if (detection.trustValueImbalanceEscalationDetected) return "trust-value-check";
  if (detection.conversionManipulationPressureDetected) return "conversion-check";
  if (detection.decisionInconsistencyDetected) return "consistency-check";
  if (detection.unstableStrategicTradeoffDetected) return "tradeoff-check";
  if (contradictions.contradictionCount >= 2) return "stabilize";
  if (marketReality.routingLane === "reinforce") return "reinforce";
  if (signals.decisionHarmony >= 0.55 && signals.balancedDecisionFormation >= 0.5) return "decision-safe";
  return "hold";
}

export function computeCommerceDecisionBalance(args: {
  signals: CommerceDecisionSignalBundle;
  decisionConfidence: number;
  governance: IntentGovernanceMeta;
  marketReality: MarketRealityIntelligenceMeta;
  detection: CommerceDecisionDetection;
  contradictions: CommerceDecisionContradictionResult;
  profile: CommerceDecisionIntelligenceProfile;
}): CommerceDecisionBalanceResult {
  const { signals, decisionConfidence, governance, marketReality, detection, contradictions, profile } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;
  if (detection.unsafePromotionDominanceDetected) governanceDampen *= 0.92;
  if (detection.decisionInconsistencyDetected) governanceDampen *= 0.94;

  const realityStable =
    !marketReality.rollbackTriggered &&
    (marketReality.analytics?.replayIntegrityAnalytics ?? 0) >= 50 &&
    !detection.unstableStrategicTradeoffDetected;

  let routingLane = resolveCommerceDecisionRoutingLane({ signals, detection, contradictions, marketReality, governance });

  if (!profile.allowsMutation && routingLane !== "replay-protect" && routingLane !== "stabilize") {
    routingLane = "hold";
  }

  const balanceScore = Math.min(
    100,
    Math.round(decisionConfidence * 40 + signals.decisionHarmony * 25 + signals.decisionQualityScore * 15 + (marketReality.realityScore ?? 0) * 0.1)
  );

  return { routingLane, governanceDampen, realityStable, balanceScore, decisionConfidence };
}

export function computeCommerceDecisionBlendInfluence(args: {
  signals: CommerceDecisionSignalBundle;
  detection: CommerceDecisionDetection;
  balance: CommerceDecisionBalanceResult;
  profile: CommerceDecisionIntelligenceProfile;
}): CommerceDecisionBlendInfluence {
  const { signals, detection, balance, profile } = args;
  const damp = balance.governanceDampen;

  const continuityInfluence = clamp(signals.trustworthyDecisionContinuity * profile.maxContinuityAmplification * damp, 0, profile.maxContinuityAmplification);
  const integrityInfluence = clamp(signals.recommendationIntegrityStability * profile.maxIntegrityAmplification * damp, 0, profile.maxIntegrityAmplification);
  const promotionDampening = clamp(detection.unsafePromotionDominanceScore * profile.maxDelta * 0.5 * damp, 0, profile.maxDelta);
  const outcomeDampening = clamp(detection.unstableRecommendationOutcomeScore * profile.maxDelta * 0.4 * damp, 0, profile.maxDelta);
  const trustValueStabilization = clamp((1 - detection.trustValueImbalanceEscalationScore) * profile.maxDelta * 0.35 * damp, 0, profile.maxDelta);
  const conversionStabilization = clamp((1 - detection.conversionManipulationPressureScore) * profile.maxDelta * 0.35 * damp, 0, profile.maxDelta);
  const formationReinforcement = clamp(signals.balancedDecisionFormation * profile.maxContinuityAmplification * 0.6, 0, profile.maxContinuityAmplification);

  const checkLanes = new Set([
    "recommendation-check",
    "outcome-check",
    "promotion-check",
    "purchase-check",
    "trust-value-check",
    "conversion-check",
    "consistency-check",
    "tradeoff-check",
  ]);

  const laneScale =
    balance.routingLane === "decision-safe" || balance.routingLane === "reinforce"
      ? 1.04
      : checkLanes.has(balance.routingLane)
        ? 0.7
        : 0.93;

  const decisionDelta = clamp(
    (continuityInfluence + integrityInfluence + trustValueStabilization + conversionStabilization + formationReinforcement - promotionDampening * 0.5 - outcomeDampening * 0.4) *
      0.06 *
      laneScale,
    0,
    profile.maxDelta
  );

  return {
    decisionDelta: round3(Math.max(0, decisionDelta)),
    continuityInfluence: round3(continuityInfluence),
    integrityInfluence: round3(integrityInfluence),
    promotionDampening: round3(promotionDampening),
    outcomeDampening: round3(outcomeDampening),
    trustValueStabilization: round3(trustValueStabilization),
    conversionStabilization: round3(conversionStabilization),
    formationReinforcement: round3(formationReinforcement),
  };
}

/**
 * P6.5 — Market reality balancer (routing + bounded influence).
 */

import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { MarketRealityContradictionResult } from "@/lib/marketReality/marketRealityContradictions";
import type { MarketRealityDetection } from "@/lib/marketReality/marketRealityDetection";
import type { MarketRealitySignalBundle } from "@/lib/marketReality/marketRealityConfidence";
import type { MarketRealityRoutingLane } from "@/lib/marketReality/marketRealityFlags";
import type { MarketRealityIntelligenceProfile } from "@/lib/marketReality/marketRealityProfiles";

export type MarketRealityBalanceResult = {
  routingLane: MarketRealityRoutingLane;
  governanceDampen: number;
  learningStable: boolean;
  balanceScore: number;
  realityConfidence: number;
};

export type MarketRealityBlendInfluence = {
  realityDelta: number;
  pricingInfluence: number;
  merchantInfluence: number;
  discountDampening: number;
  volatilityDampening: number;
  trustStabilization: number;
  offerStabilization: number;
  ecosystemReinforcement: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function resolveMarketRealityRoutingLane(args: {
  signals: MarketRealitySignalBundle;
  detection: MarketRealityDetection;
  contradictions: MarketRealityContradictionResult;
  memoryless: MemorylessCommerceLearningMeta;
  governance: IntentGovernanceMeta;
}): MarketRealityRoutingLane {
  const { signals, detection, contradictions, memoryless, governance } = args;

  if (governance.anomalyDetected || memoryless.rollbackTriggered) return "stabilize";
  if (memoryless.routingLane === "replay-protect") return "replay-protect";
  if (detection.fakeDiscountDetected) return "discount-check";
  if (detection.retailerInstabilityDetected) return "retailer-check";
  if (detection.priceVolatilityDetected) return "volatility-check";
  if (detection.listingQualityDegradationDetected) return "listing-check";
  if (detection.marketplaceInconsistencyDetected) return "marketplace-check";
  if (detection.trustDecayDetected) return "trust-check";
  if (detection.inventoryInstabilityDetected) return "inventory-check";
  if (detection.unreliableOfferDetected) return "offer-check";
  if (detection.lowSignalMarketplaceDetected) return "signal-check";
  if (contradictions.contradictionCount >= 2) return "stabilize";
  if (memoryless.routingLane === "reinforce") return "reinforce";
  if (signals.realityHarmony >= 0.55 && signals.verifiedPricingContinuity >= 0.5) return "pricing-safe";
  return "hold";
}

export function computeMarketRealityBalance(args: {
  signals: MarketRealitySignalBundle;
  realityConfidence: number;
  governance: IntentGovernanceMeta;
  memoryless: MemorylessCommerceLearningMeta;
  detection: MarketRealityDetection;
  contradictions: MarketRealityContradictionResult;
  profile: MarketRealityIntelligenceProfile;
}): MarketRealityBalanceResult {
  const { signals, realityConfidence, governance, memoryless, detection, contradictions, profile } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.9;
  if (detection.fakeDiscountDetected) governanceDampen *= 0.92;
  if (detection.retailerInstabilityDetected) governanceDampen *= 0.94;

  const learningStable =
    !memoryless.rollbackTriggered &&
    (memoryless.analytics?.replayIntegrityAnalytics ?? 0) >= 50 &&
    !memoryless.strategicOscillationDetected;

  let routingLane = resolveMarketRealityRoutingLane({ signals, detection, contradictions, memoryless, governance });

  if (!profile.allowsMutation && routingLane !== "replay-protect" && routingLane !== "stabilize") {
    routingLane = "hold";
  }

  const balanceScore = Math.min(
    100,
    Math.round(realityConfidence * 40 + signals.realityHarmony * 25 + signals.offerEcosystemStability * 15 + (memoryless.learningScore ?? 0) * 0.1)
  );

  return { routingLane, governanceDampen, learningStable, balanceScore, realityConfidence };
}

export function computeMarketRealityBlendInfluence(args: {
  signals: MarketRealitySignalBundle;
  detection: MarketRealityDetection;
  balance: MarketRealityBalanceResult;
  profile: MarketRealityIntelligenceProfile;
}): MarketRealityBlendInfluence {
  const { signals, detection, balance, profile } = args;
  const damp = balance.governanceDampen;

  const pricingInfluence = clamp(signals.verifiedPricingContinuity * profile.maxPricingAmplification * damp, 0, profile.maxPricingAmplification);
  const merchantInfluence = clamp(signals.trustedMerchantStability * profile.maxMerchantAmplification * damp, 0, profile.maxMerchantAmplification);
  const discountDampening = clamp(detection.fakeDiscountScore * profile.maxDelta * 0.5 * damp, 0, profile.maxDelta);
  const volatilityDampening = clamp(detection.priceVolatilityScore * profile.maxDelta * 0.4 * damp, 0, profile.maxDelta);
  const trustStabilization = clamp((1 - detection.trustDecayScore) * profile.maxDelta * 0.35 * damp, 0, profile.maxDelta);
  const offerStabilization = clamp((1 - detection.unreliableOfferScore) * profile.maxDelta * 0.35 * damp, 0, profile.maxDelta);
  const ecosystemReinforcement = clamp(signals.realityHarmony * profile.maxPricingAmplification * 0.6, 0, profile.maxPricingAmplification);

  const laneScale =
    balance.routingLane === "pricing-safe" || balance.routingLane === "reinforce"
      ? 1.04
      : balance.routingLane === "discount-check" ||
          balance.routingLane === "retailer-check" ||
          balance.routingLane === "volatility-check" ||
          balance.routingLane === "listing-check" ||
          balance.routingLane === "marketplace-check" ||
          balance.routingLane === "trust-check" ||
          balance.routingLane === "inventory-check" ||
          balance.routingLane === "offer-check" ||
          balance.routingLane === "signal-check"
        ? 0.7
        : 0.93;

  const realityDelta = clamp(
    (pricingInfluence + merchantInfluence + trustStabilization + offerStabilization + ecosystemReinforcement - discountDampening * 0.5 - volatilityDampening * 0.4) *
      0.06 *
      laneScale,
    0,
    profile.maxDelta
  );

  return {
    realityDelta: round3(Math.max(0, realityDelta)),
    pricingInfluence: round3(pricingInfluence),
    merchantInfluence: round3(merchantInfluence),
    discountDampening: round3(discountDampening),
    volatilityDampening: round3(volatilityDampening),
    trustStabilization: round3(trustStabilization),
    offerStabilization: round3(offerStabilization),
    ecosystemReinforcement: round3(ecosystemReinforcement),
  };
}

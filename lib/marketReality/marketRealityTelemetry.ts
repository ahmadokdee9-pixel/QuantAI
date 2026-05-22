/**
 * P6.5 — Market reality intelligence telemetry (meta.marketRealityIntelligence).
 */

import type { MarketRealityBalanceResult, MarketRealityBlendInfluence } from "@/lib/marketReality/marketRealityBalancer";
import type { MarketRealityContradictionResult } from "@/lib/marketReality/marketRealityContradictions";
import type { MarketRealityDetection } from "@/lib/marketReality/marketRealityDetection";
import type { MarketRealityIntelligenceMode, MarketRealityRoutingLane } from "@/lib/marketReality/marketRealityFlags";
import type { MarketRealityIntelligenceProfile } from "@/lib/marketReality/marketRealityProfiles";
import type { MarketRealitySignalBundle } from "@/lib/marketReality/marketRealityConfidence";

export type MarketRealityIntelligenceAnalytics = {
  discountAnalytics: number;
  retailerAnalytics: number;
  volatilityAnalytics: number;
  listingAnalytics: number;
  marketplaceAnalytics: number;
  trustAnalytics: number;
  inventoryAnalytics: number;
  offerAnalytics: number;
  signalAnalytics: number;
  pricingAnalytics: number;
  merchantAnalytics: number;
  harmonyAnalytics: number;
  contradictionAnalytics: number;
  replayIntegrityAnalytics: number;
  topDriftCount: number;
};

export type MarketRealityIntelligenceMonitoring = {
  realityInstability: boolean;
  contradictionRisk: boolean;
  discountRisk: boolean;
  retailerRisk: boolean;
  replayIntegrityValid: boolean;
  pricingContinuityValid: boolean;
  crossRealityBalanceValid: boolean;
  upstreamStable: boolean;
};

export type MarketRealityIntelligenceMeta = {
  version: "market-reality-intelligence-v1";
  realityActive: boolean;
  realityProfile: MarketRealityIntelligenceMode;
  realityScore: number;
  realityDelta: number;
  realityConfidence: number;
  fakeDiscountDetected: boolean;
  retailerInstabilityDetected: boolean;
  priceVolatilityDetected: boolean;
  listingQualityDegradationDetected: boolean;
  marketplaceInconsistencyDetected: boolean;
  trustDecayDetected: boolean;
  inventoryInstabilityDetected: boolean;
  unreliableOfferDetected: boolean;
  lowSignalMarketplaceDetected: boolean;
  fakeDiscountScore: number;
  verifiedPricingContinuity: number;
  trustedMerchantStability: number;
  contradictionCount: number;
  routingLane: MarketRealityRoutingLane | string;
  rollbackTriggered: boolean;
  realityWarnings: string[];
  realityAnomalies: string[];
  analytics: MarketRealityIntelligenceAnalytics;
  monitoring: MarketRealityIntelligenceMonitoring;
  mutationApplied: boolean;
  signalHash: string;
  graphExecutionHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildMarketRealityAnalytics(args: {
  signals: MarketRealitySignalBundle;
  influence: MarketRealityBlendInfluence;
  detection: MarketRealityDetection;
  contradictions: MarketRealityContradictionResult;
  replayIntegrity: number;
  topDrift: number;
}): MarketRealityIntelligenceAnalytics {
  const { signals, influence, detection, contradictions, replayIntegrity, topDrift } = args;
  return {
    discountAnalytics: clampScore((1 - signals.fakeDiscountScore) * 100 + influence.discountDampening * 10),
    retailerAnalytics: clampScore((1 - signals.retailerInstabilityScore) * 100 + influence.merchantInfluence * 15),
    volatilityAnalytics: clampScore((1 - signals.priceVolatilityScore) * 100 + influence.volatilityDampening * 10),
    listingAnalytics: clampScore((1 - signals.listingQualityDegradationScore) * 100),
    marketplaceAnalytics: clampScore((1 - signals.marketplaceInconsistencyScore) * 100),
    trustAnalytics: clampScore((1 - signals.trustDecayScore) * 100 + influence.trustStabilization * 15),
    inventoryAnalytics: clampScore((1 - signals.inventoryInstabilityScore) * 100),
    offerAnalytics: clampScore((1 - signals.unreliableOfferScore) * 100 + influence.offerStabilization * 15),
    signalAnalytics: clampScore((1 - signals.lowSignalMarketplaceScore) * 100),
    pricingAnalytics: clampScore(influence.pricingInfluence * 100),
    merchantAnalytics: clampScore(influence.merchantInfluence * 100),
    harmonyAnalytics: clampScore(signals.realityHarmony * 100),
    contradictionAnalytics: clampScore(contradictions.uncertaintyScore * 100),
    replayIntegrityAnalytics: replayIntegrity,
    topDriftCount: topDrift,
  };
}

export function buildMarketRealityMonitoring(args: {
  influence: MarketRealityBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: MarketRealityBalanceResult;
  detection: MarketRealityDetection;
  contradictions: MarketRealityContradictionResult;
  topDrift: number;
  profile: MarketRealityIntelligenceProfile;
}): MarketRealityIntelligenceMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, detection, contradictions, profile } = args;
  return {
    realityInstability: rollbackTriggered || !balance.learningStable,
    contradictionRisk: contradictions.contradictionCount >= 2,
    discountRisk: detection.fakeDiscountDetected,
    retailerRisk: detection.retailerInstabilityDetected,
    replayIntegrityValid: replayIntegrity >= 70,
    pricingContinuityValid: influence.pricingInfluence <= profile.maxPricingAmplification,
    crossRealityBalanceValid: influence.realityDelta <= profile.maxDelta,
    upstreamStable: balance.learningStable,
  };
}

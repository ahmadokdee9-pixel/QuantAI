/**
 * P5.8 — Market intelligence telemetry (analytics + monitoring).
 */

import type { MarketBalanceResult, MarketBlendInfluence } from "@/lib/market/marketBalancer";
import type { MarketIntelligenceMode, MarketRoutingLane } from "@/lib/market/marketFlags";
import type { MarketProfile } from "@/lib/market/marketProfiles";
import type { MarketSignalBundle } from "@/lib/market/marketSignals";

export type MarketIntelligenceAnalytics = {
  momentumAnalytics: number;
  pressureAnalytics: number;
  volatilityAnalytics: number;
  trustAnalytics: number;
  lifecycleAnalytics: number;
  pricingAnalytics: number;
  conversionMarketAnalytics: number;
  rankingContinuityAnalytics: number;
  replayIntegrityAnalytics: number;
  topDriftCount: number;
};

export type MarketMonitoring = {
  marketInstability: boolean;
  momentumInflation: boolean;
  pricingDrift: boolean;
  categoryDrift: boolean;
  replayIntegrityValid: boolean;
  rankingContinuityValid: boolean;
  volatilityAmplification: boolean;
  trustAmplification: boolean;
};

export type MarketIntelligenceMeta = {
  version: "market-intelligence-v1";
  marketActive: boolean;
  marketProfile: MarketIntelligenceMode;
  marketScore: number;
  marketDelta: number;
  marketConfidence: number;
  marketMomentum: number;
  marketPressure: number;
  marketVolatility: number;
  marketTrust: number;
  marketLifecycle: number;
  routingLane: MarketRoutingLane | string;
  rollbackTriggered: boolean;
  marketWarnings: string[];
  marketAnomalies: string[];
  analytics: MarketIntelligenceAnalytics;
  monitoring: MarketMonitoring;
  mutationApplied: boolean;
  signalHash: string;
  graphExecutionHash: string;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function buildMarketAnalytics(args: {
  signals: MarketSignalBundle;
  influence: MarketBlendInfluence;
  replayIntegrity: number;
  topDrift: number;
}): MarketIntelligenceAnalytics {
  const { signals, influence, replayIntegrity, topDrift } = args;
  return {
    momentumAnalytics: clampScore(signals.marketMomentum * 100),
    pressureAnalytics: clampScore(signals.marketPressure * 100),
    volatilityAnalytics: clampScore(signals.marketVolatility * 100),
    trustAnalytics: clampScore(signals.marketTrust * 100 + influence.trustAmplification * 20),
    lifecycleAnalytics: clampScore(signals.marketLifecycle * 100),
    pricingAnalytics: clampScore(signals.pricingRealism * 100),
    conversionMarketAnalytics: clampScore(signals.conversionMarket * 100),
    rankingContinuityAnalytics: clampScore(influence.continuityStrength * 100),
    replayIntegrityAnalytics: replayIntegrity,
    topDriftCount: topDrift,
  };
}

export function buildMarketMonitoring(args: {
  influence: MarketBlendInfluence;
  replayIntegrity: number;
  rollbackTriggered: boolean;
  balance: MarketBalanceResult;
  signals: MarketSignalBundle;
  topDrift: number;
  profile: MarketProfile;
}): MarketMonitoring {
  const { influence, replayIntegrity, rollbackTriggered, balance, signals, topDrift, profile } = args;
  return {
    marketInstability: rollbackTriggered || !balance.strategyStable || !balance.reasoningStable,
    momentumInflation: balance.marketConfidence > 0.95 && influence.momentumAmplification > profile.maxMomentumAmplification * 0.8,
    pricingDrift: signals.pricingRealism < 0.25,
    categoryDrift: topDrift > profile.maxDelta,
    replayIntegrityValid: replayIntegrity >= 70,
    rankingContinuityValid: influence.continuityStrength <= profile.maxDelta,
    volatilityAmplification: influence.volatilityAmplification <= profile.maxVolatilityAmplification,
    trustAmplification: influence.trustAmplification <= profile.maxTrustAmplification,
  };
}

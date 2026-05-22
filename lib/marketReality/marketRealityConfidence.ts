/**
 * P6.5 — Market reality confidence + signal bundle.
 */

import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { MarketRealityContradictionResult } from "@/lib/marketReality/marketRealityContradictions";
import type { MarketRealityDetection } from "@/lib/marketReality/marketRealityDetection";
import type { UnifiedMarketRealityState } from "@/lib/marketReality/marketRealityFusion";

export type MarketRealitySignalBundle = {
  fakeDiscountScore: number;
  retailerInstabilityScore: number;
  priceVolatilityScore: number;
  listingQualityDegradationScore: number;
  marketplaceInconsistencyScore: number;
  trustDecayScore: number;
  inventoryInstabilityScore: number;
  unreliableOfferScore: number;
  lowSignalMarketplaceScore: number;
  verifiedPricingContinuity: number;
  trustedMerchantStability: number;
  offerEcosystemStability: number;
  realityHarmony: number;
  signalHash: string;
  graphExecutionHash: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function buildMarketRealitySignalBundle(state: UnifiedMarketRealityState): MarketRealitySignalBundle {
  const core = {
    fakeDiscountScore: state.fakeDiscountScore,
    retailerInstabilityScore: state.retailerInstabilityScore,
    priceVolatilityScore: state.priceVolatilityScore,
    listingQualityDegradationScore: state.listingQualityDegradationScore,
    marketplaceInconsistencyScore: state.marketplaceInconsistencyScore,
    trustDecayScore: state.trustDecayScore,
    inventoryInstabilityScore: state.inventoryInstabilityScore,
    unreliableOfferScore: state.unreliableOfferScore,
    lowSignalMarketplaceScore: state.lowSignalMarketplaceScore,
    verifiedPricingContinuity: state.verifiedPricingContinuity,
    trustedMerchantStability: state.trustedMerchantStability,
    offerEcosystemStability: state.offerEcosystemStability,
    realityHarmony: state.realityHarmony,
  };

  const signalHash = Object.entries(core)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(Number(v) * 1000)}`)
    .join("|");

  const graphExecutionHash = [
    `disc:${core.fakeDiscountScore}`,
    `ret:${core.retailerInstabilityScore}`,
    `price:${core.verifiedPricingContinuity}`,
    `harm:${core.realityHarmony}`,
  ].join(",");

  return { ...core, signalHash, graphExecutionHash };
}

export function computeMarketRealityConfidence(args: {
  signals: MarketRealitySignalBundle;
  strategic: AdaptiveStrategicRankingMeta;
  memoryless: MemorylessCommerceLearningMeta;
  detection: MarketRealityDetection;
  contradictions: MarketRealityContradictionResult;
  governanceDampen: number;
}): number {
  const { signals, strategic, memoryless, detection, contradictions, governanceDampen } = args;

  const signalConfidence = clamp(
    signals.realityHarmony * 0.22 +
      signals.offerEcosystemStability * 0.18 +
      signals.verifiedPricingContinuity * 0.15 +
      signals.trustedMerchantStability * 0.12 +
      (strategic.strategicRankingConfidence ?? 0) * 0.1 +
      (memoryless.learningConfidence ?? 0) * 0.08 -
      signals.lowSignalMarketplaceScore * 0.08 -
      (detection.fakeDiscountDetected ? 0.05 : 0),
    0,
    1
  );

  return round3(clamp((signalConfidence - contradictions.uncertaintyScore * 0.1) * governanceDampen, 0, 1));
}

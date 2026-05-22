/**
 * P6.5 — Unified market reality state synthesis.
 */

import type { MarketRealityDetection } from "@/lib/marketReality/marketRealityDetection";
import type { MarketRealityStabilization } from "@/lib/marketReality/marketRealityStabilization";

export type UnifiedMarketRealityState = {
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
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function synthesizeUnifiedMarketRealityState(args: {
  detection: MarketRealityDetection;
  stabilization: MarketRealityStabilization;
}): UnifiedMarketRealityState {
  const riskScores = [
    args.detection.fakeDiscountScore,
    args.detection.retailerInstabilityScore,
    args.detection.priceVolatilityScore,
    args.detection.listingQualityDegradationScore,
    args.detection.marketplaceInconsistencyScore,
    args.detection.trustDecayScore,
    args.detection.inventoryInstabilityScore,
    args.detection.unreliableOfferScore,
    args.detection.lowSignalMarketplaceScore,
  ];
  const meanRisk = riskScores.reduce((s, v) => s + v, 0) / riskScores.length;
  const realityHarmony = round3(
    clamp(args.stabilization.offerEcosystemStability * 0.55 + (1 - meanRisk) * 0.45, 0, 1)
  );

  return {
    fakeDiscountScore: args.detection.fakeDiscountScore,
    retailerInstabilityScore: args.detection.retailerInstabilityScore,
    priceVolatilityScore: args.detection.priceVolatilityScore,
    listingQualityDegradationScore: args.detection.listingQualityDegradationScore,
    marketplaceInconsistencyScore: args.detection.marketplaceInconsistencyScore,
    trustDecayScore: args.detection.trustDecayScore,
    inventoryInstabilityScore: args.detection.inventoryInstabilityScore,
    unreliableOfferScore: args.detection.unreliableOfferScore,
    lowSignalMarketplaceScore: args.detection.lowSignalMarketplaceScore,
    verifiedPricingContinuity: args.stabilization.verifiedPricingContinuity,
    trustedMerchantStability: args.stabilization.trustedMerchantStability,
    offerEcosystemStability: args.stabilization.offerEcosystemStability,
    realityHarmony,
  };
}

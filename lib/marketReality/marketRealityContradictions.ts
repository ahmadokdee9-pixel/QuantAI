/**
 * P6.5 — Market reality contradiction detection.
 */

import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { MarketRealityDetection } from "@/lib/marketReality/marketRealityDetection";
import type { UnifiedMarketRealityState } from "@/lib/marketReality/marketRealityFusion";

export type MarketRealityContradictionResult = {
  contradictionCount: number;
  contradictions: string[];
  uncertaintyScore: number;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function detectMarketRealityContradictions(args: {
  state: UnifiedMarketRealityState;
  detection: MarketRealityDetection;
  memoryless: MemorylessCommerceLearningMeta;
}): MarketRealityContradictionResult {
  const { state, detection, memoryless } = args;
  const contradictions: string[] = [];

  if (detection.fakeDiscountDetected && state.verifiedPricingContinuity >= 0.6) contradictions.push("discount_pricing_conflict");
  if (detection.retailerInstabilityDetected && state.trustedMerchantStability >= 0.6) contradictions.push("retailer_stability_conflict");
  if (detection.marketplaceInconsistencyDetected && state.offerEcosystemStability >= 0.55) contradictions.push("marketplace_ecosystem_conflict");
  if (detection.trustDecayDetected && detection.unreliableOfferDetected) contradictions.push("trust_offer_conflict");
  if (memoryless.rollbackTriggered) contradictions.push("learning_rollback");
  if (memoryless.contradictionCount >= 2) contradictions.push("learning_upstream_conflict");
  if (state.realityHarmony < 0.35) contradictions.push("reality_imbalance");

  const uncertaintyScore = round3(
    Math.min(1, contradictions.length * 0.1 + (1 - state.realityHarmony) * 0.2 + memoryless.contradictionCount * 0.05)
  );

  return {
    contradictionCount: contradictions.length,
    contradictions: contradictions.slice(0, 8),
    uncertaintyScore,
  };
}

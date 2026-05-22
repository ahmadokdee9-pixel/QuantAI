/**
 * P6.5 — Verified pricing continuity + trusted merchant stability (aggregate telemetry only).
 */

import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { MarketRealityDetection } from "@/lib/marketReality/marketRealityDetection";
import { getStoreTrustScore } from "@/lib/retailTrust";
import type { QuantProduct } from "@/lib/shoppingScore";

export type MarketRealityStabilization = {
  verifiedPricingContinuity: number;
  trustedMerchantStability: number;
  offerEcosystemStability: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeMarketRealityStabilization(args: {
  products: QuantProduct[];
  strategic: AdaptiveStrategicRankingMeta;
  memoryless: MemorylessCommerceLearningMeta;
  detection: MarketRealityDetection;
}): MarketRealityStabilization {
  const { products, strategic, memoryless, detection } = args;
  const tray = products.slice(0, 12);

  const pricingSignals = tray.map((p) => {
    const rt = p.qiRealityTrust;
    const stableTrend = p.priceTrend === "stable" ? 0.25 : 0;
    const lowFake = rt ? 1 - (rt.fakeDiscountProbability ?? 0) * 0.5 - (rt.discountManipulationRisk ?? 0) * 0.3 : 0.45;
    return clamp(stableTrend + lowFake * 0.55, 0, 1);
  });
  const verifiedPricingContinuity = round3(
    clamp(
      avg(pricingSignals) * 0.55 +
        (memoryless.continuityReinforcement ?? 0) * 0.2 +
        (strategic.rankingContinuity ?? 0) * 0.15 -
        detection.fakeDiscountScore * 0.15 -
        detection.priceVolatilityScore * 0.1,
      0,
      1
    )
  );

  const merchantSignals = tray.map((p) => {
    const rt = p.qiRealityTrust;
    const storeTrust = getStoreTrustScore(p.store) / 100;
    return clamp((rt?.retailerReliability01 ?? storeTrust) * 0.65 + storeTrust * 0.35 - (rt?.weakRetailer ? 0.25 : 0), 0, 1);
  });
  const trustedMerchantStability = round3(
    clamp(
      avg(merchantSignals) * 0.6 +
        (memoryless.analytics?.trustAnalytics ?? 0) * 0.01 * 0.15 +
        (strategic.trustValueBalance ?? 0) * 0.15 -
        detection.retailerInstabilityScore * 0.12 -
        detection.trustDecayScore * 0.1,
      0,
      1
    )
  );

  const offerEcosystemStability = round3(
    clamp(
      verifiedPricingContinuity * 0.4 +
        trustedMerchantStability * 0.35 +
        (memoryless.analytics?.harmonyAnalytics ?? 0) * 0.01 * 0.15 +
        (1 - detection.unreliableOfferScore) * 0.1 -
        detection.marketplaceInconsistencyScore * 0.08,
      0,
      1
    )
  );

  return { verifiedPricingContinuity, trustedMerchantStability, offerEcosystemStability };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

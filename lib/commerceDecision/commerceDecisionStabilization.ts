/**
 * P6.6 — Decision continuity + recommendation integrity stabilization.
 */

import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { CommerceDecisionDetection } from "@/lib/commerceDecision/commerceDecisionDetection";

export type CommerceDecisionStabilization = {
  trustworthyDecisionContinuity: number;
  recommendationIntegrityStability: number;
  balancedDecisionFormation: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeCommerceDecisionStabilization(args: {
  strategic: AdaptiveStrategicRankingMeta;
  memoryless: MemorylessCommerceLearningMeta;
  marketReality: MarketRealityIntelligenceMeta;
  detection: CommerceDecisionDetection;
}): CommerceDecisionStabilization {
  const { strategic, memoryless, marketReality, detection } = args;

  const trustworthyDecisionContinuity = round3(
    clamp(
      detection.decisionQualityScore * 0.35 +
        (memoryless.continuityReinforcement ?? 0) * 0.25 +
        (marketReality.verifiedPricingContinuity ?? 0) * 0.2 +
        (strategic.rankingContinuity ?? 0) * 0.15 -
        detection.decisionInconsistencyScore * 0.12,
      0,
      1
    )
  );

  const recommendationIntegrityStability = round3(
    clamp(
      (strategic.analytics?.replayIntegrityAnalytics ?? 0) * 0.01 * 0.35 +
        (memoryless.analytics?.replayIntegrityAnalytics ?? 0) * 0.01 * 0.25 +
        (marketReality.analytics?.replayIntegrityAnalytics ?? 0) * 0.01 * 0.2 +
        trustworthyDecisionContinuity * 0.2 -
        detection.weakRecommendationStructureScore * 0.1,
      0,
      1
    )
  );

  const balancedDecisionFormation = round3(
    clamp(
      trustworthyDecisionContinuity * 0.4 +
        recommendationIntegrityStability * 0.35 +
        (marketReality.trustedMerchantStability ?? 0) * 0.15 +
        (1 - detection.unstableStrategicTradeoffScore) * 0.1 -
        detection.trustValueImbalanceEscalationScore * 0.08,
      0,
      1
    )
  );

  return { trustworthyDecisionContinuity, recommendationIntegrityStability, balancedDecisionFormation };
}

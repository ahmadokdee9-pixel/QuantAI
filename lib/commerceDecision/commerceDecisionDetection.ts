/**
 * P6.6 — Commerce decision detection (deterministic aggregate telemetry; no user memory).
 */

import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";

export type CommerceDecisionDetection = {
  weakRecommendationStructureDetected: boolean;
  unstableRecommendationOutcomeDetected: boolean;
  unsafePromotionDominanceDetected: boolean;
  lowConfidencePurchaseDecisionDetected: boolean;
  trustValueImbalanceEscalationDetected: boolean;
  conversionManipulationPressureDetected: boolean;
  decisionInconsistencyDetected: boolean;
  unstableStrategicTradeoffDetected: boolean;
  decisionQualityScore: number;
  weakRecommendationStructureScore: number;
  unstableRecommendationOutcomeScore: number;
  unsafePromotionDominanceScore: number;
  lowConfidencePurchaseDecisionScore: number;
  trustValueImbalanceEscalationScore: number;
  conversionManipulationPressureScore: number;
  decisionInconsistencyScore: number;
  unstableStrategicTradeoffScore: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

function variance(nums: number[]): number {
  if (nums.length <= 1) return 0;
  const mean = avg(nums);
  return nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length;
}

export function detectCommerceDecisionSignals(args: {
  products: QuantProduct[];
  intent: IntentCognitionMeta;
  multiObjective: MultiObjectiveCommerceMeta;
  strategic: AdaptiveStrategicRankingMeta;
  memoryless: MemorylessCommerceLearningMeta;
  marketReality: MarketRealityIntelligenceMeta;
}): CommerceDecisionDetection {
  const { products, intent, multiObjective, strategic, memoryless, marketReality } = args;
  const tray = products.slice(0, 8);
  const composites = tray.map((p) => p.qiComposite ?? 50);
  const topSpread = composites.length >= 2 ? Math.max(...composites.slice(0, 3)) - Math.min(...composites.slice(0, 3)) : 0;

  const weakRecommendationStructureScore = round3(
    clamp(
      (topSpread < 8 ? 0.45 : 0.1) +
        ((tray[0]?.qiComposite ?? 0) < 40 ? 0.25 : 0) +
        (1 - (memoryless.learningConfidence ?? 0)) * 0.15,
      0,
      1
    )
  );
  const weakRecommendationStructureDetected = weakRecommendationStructureScore >= 0.4 || topSpread < 6;

  const deltas = [intent.intentDelta ?? 0, multiObjective.multiObjectiveDelta ?? 0, strategic.strategicRankingDelta ?? 0, memoryless.learningDelta ?? 0, marketReality.realityDelta ?? 0];
  const unstableRecommendationOutcomeScore = round3(clamp(Math.sqrt(variance(deltas)) * 0.8 + (memoryless.analytics?.topDriftCount ?? 0) * 0.08, 0, 1));
  const unstableRecommendationOutcomeDetected = unstableRecommendationOutcomeScore >= 0.35 || deltas.some((d) => d > 0.85);

  const unsafePromotionDominanceScore = round3(
    clamp(
      (marketReality.fakeDiscountScore ?? 0) * 0.45 +
        ((multiObjective.conversionObjective ?? 0) > 0.6 ? 0.2 : 0) +
        (marketReality.fakeDiscountDetected ? 0.2 : 0),
      0,
      1
    )
  );
  const unsafePromotionDominanceDetected = unsafePromotionDominanceScore >= 0.4 || marketReality.fakeDiscountDetected;

  const confidences = [intent.intentConfidence ?? 0, multiObjective.multiObjectiveConfidence ?? 0, strategic.strategicRankingConfidence ?? 0, memoryless.learningConfidence ?? 0, marketReality.realityConfidence ?? 0];
  const lowConfCount = confidences.filter((c) => c < 0.4).length;
  const lowConfidencePurchaseDecisionScore = round3(clamp(lowConfCount / confidences.length + (1 - avg(confidences)) * 0.25, 0, 1));
  const lowConfidencePurchaseDecisionDetected = lowConfCount >= 3 || avg(confidences) < 0.38;

  const trustGap = Math.abs((intent.trustIntent ?? 0) - (multiObjective.trustObjective ?? 0));
  const valueGap = Math.abs((strategic.trustValueBalance ?? 0) - (strategic.premiumAffordabilityBalance ?? 0));
  const trustValueImbalanceEscalationScore = round3(clamp(trustGap * 0.35 + valueGap * 0.35 + (marketReality.trustDecayDetected ? 0.2 : 0), 0, 1));
  const trustValueImbalanceEscalationDetected = trustValueImbalanceEscalationScore >= 0.4 || strategic.trustDominanceGuardActive;

  const conversionManipulationPressureScore = round3(
    clamp(
      (multiObjective.conversionObjective ?? 0) * 0.35 +
        (marketReality.fakeDiscountScore ?? 0) * 0.25 +
        (marketReality.unreliableOfferDetected ? 0.2 : 0) +
        (memoryless.conversionInstabilityDetected ? 0.15 : 0),
      0,
      1
    )
  );
  const conversionManipulationPressureDetected =
    conversionManipulationPressureScore >= 0.4 || memoryless.conversionInstabilityDetected || marketReality.unreliableOfferDetected;

  const laneMismatch =
    strategic.routingLane !== memoryless.routingLane && memoryless.routingLane !== marketReality.routingLane ? 0.25 : 0;
  const decisionInconsistencyScore = round3(
    clamp(
      laneMismatch +
        Math.abs((strategic.strategicRankingScore ?? 0) - (memoryless.learningScore ?? 0)) * 0.004 +
        Math.abs((memoryless.learningScore ?? 0) - (marketReality.realityScore ?? 0)) * 0.004 +
        (memoryless.contradictionCount >= 2 ? 0.15 : 0),
      0,
      1
    )
  );
  const decisionInconsistencyDetected = decisionInconsistencyScore >= 0.35 || memoryless.contradictionCount >= 2;

  const balances = [strategic.trustValueBalance ?? 0, strategic.premiumAffordabilityBalance ?? 0, strategic.conversionStabilityBalance ?? 0, strategic.aestheticPracticalityBalance ?? 0];
  const unstableStrategicTradeoffScore = round3(clamp(Math.sqrt(variance(balances)) * 0.9 + (memoryless.strategicOscillationDetected ? 0.2 : 0), 0, 1));
  const unstableStrategicTradeoffDetected = unstableStrategicTradeoffScore >= 0.42 || memoryless.strategicOscillationDetected;

  const riskMean = avg([
    weakRecommendationStructureScore,
    unstableRecommendationOutcomeScore,
    unsafePromotionDominanceScore,
    lowConfidencePurchaseDecisionScore,
    trustValueImbalanceEscalationScore,
    conversionManipulationPressureScore,
    decisionInconsistencyScore,
    unstableStrategicTradeoffScore,
  ]);
  const decisionQualityScore = round3(clamp(1 - riskMean * 0.85 + (marketReality.verifiedPricingContinuity ?? 0) * 0.1 + (memoryless.continuityReinforcement ?? 0) * 0.05, 0, 1));

  return {
    weakRecommendationStructureDetected,
    unstableRecommendationOutcomeDetected,
    unsafePromotionDominanceDetected,
    lowConfidencePurchaseDecisionDetected,
    trustValueImbalanceEscalationDetected,
    conversionManipulationPressureDetected,
    decisionInconsistencyDetected,
    unstableStrategicTradeoffDetected,
    decisionQualityScore,
    weakRecommendationStructureScore,
    unstableRecommendationOutcomeScore,
    unsafePromotionDominanceScore,
    lowConfidencePurchaseDecisionScore,
    trustValueImbalanceEscalationScore,
    conversionManipulationPressureScore,
    decisionInconsistencyScore,
    unstableStrategicTradeoffScore,
  };
}

/**
 * P5.7 — Strategic signal bundle (deterministic; no embeddings).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import type { ConversionQuality } from "@/lib/strategy/strategyConversion";
import type { MarketPositioning } from "@/lib/strategy/strategyMarket";
import type { StrategicComparison } from "@/lib/strategy/strategyComparisons";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

export type StrategySignalBundle = {
  conversionConfidence: number;
  strategicTrust: number;
  strategicValue: number;
  premiumPositioning: number;
  categoryDominance: number;
  productAttractiveness: number;
  recommendationHierarchy: number;
  comparisonIntelligence: number;
  merchantStrength: number;
  momentumConfidence: number;
  marketPositioning: number;
  deliveryAttractiveness: number;
  commerceStability: number;
  rankingContinuity: number;
  replayIntegrity: number;
  signalHash: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function buildSignalHash(signals: Omit<StrategySignalBundle, "signalHash">): string {
  return Object.entries(signals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(v * 1000)}`)
    .join("|");
}

export function buildStrategySignals(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  memory: IntentMemoryMeta;
  fusion: IntentFusionMeta;
  reasoning: AdaptiveReasoningMeta;
  decision: DecisionIntelligenceMeta;
  market: MarketPositioning;
  conversion: ConversionQuality;
  comparison: StrategicComparison;
}): StrategySignalBundle {
  const { products, canonicalQuery, governance, calibration, memory, fusion, reasoning, decision, market, conversion, comparison } =
    args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;

  const trustStores = products.slice(0, 5).map((p) => getStoreTrustScore(p.store) / 100);
  const avgTrust = trustStores.length ? trustStores.reduce((s, t) => s + t, 0) / trustStores.length : 0.5;
  const categoryDominance = canonicalQuery.category !== "unknown" ? 0.7 : 0.4;

  const core = {
    conversionConfidence: conversion.conversionConfidence,
    strategicTrust: round3(avgTrust * decision.trustDecision * 0.5 + reasoning.trustReasoning * 0.3 * governanceDampen),
    strategicValue: round3(decision.valueDecision * 0.5 + fusion.valueFusion * 0.3 * governanceDampen),
    premiumPositioning: round3(canonicalQuery.intent.premium01 * decision.premiumDecision * 0.5 * governanceDampen),
    categoryDominance: round3(categoryDominance * market.categoryFocus),
    productAttractiveness: conversion.productAttractiveness,
    recommendationHierarchy: round3(
      decision.analytics.recommendationQualityAnalytics * 0.01 * calibration.calibrationScore * 0.01
    ),
    comparisonIntelligence: comparison.comparisonIntelligence,
    merchantStrength: round3(avgTrust * fusion.analytics.merchantFairnessAnalytics * 0.01),
    momentumConfidence: round3(market.priceSpread * 0.4 + conversion.trustToConversion * 0.3),
    marketPositioning: market.marketPositionScore,
    deliveryAttractiveness: round3(decision.deliveryDecision * 0.5 + fusion.urgencyFusion * 0.3),
    commerceStability: round3(
      (decision.analytics.purchaseQualityAnalytics * 0.01 +
        reasoning.analytics.commerceStabilityAnalytics * 0.01 +
        fusion.fusionScore * 0.01) /
        3
    ),
    rankingContinuity: round3(memory.continuityScore * 0.01 * decision.continuityStrength),
    replayIntegrity: round3(decision.replayIntegrity * 0.01 * reasoning.replayIntegrity * 0.01),
  };

  return { ...core, signalHash: buildSignalHash(core) };
}

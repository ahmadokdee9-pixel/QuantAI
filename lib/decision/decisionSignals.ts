/**
 * P5.6 — Commerce decision signals (deterministic; no embeddings).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

export type DecisionSignalBundle = {
  trustScore: number;
  valueScore: number;
  premiumScore: number;
  budgetAlignment: number;
  qualityConfidence: number;
  urgencyConfidence: number;
  comparisonConfidence: number;
  merchantReliability: number;
  deliveryConfidence: number;
  discountAuthenticity: number;
  returnRiskScore: number;
  stabilityScore: number;
  recommendationStrength: number;
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

function avgRating(products: QuantProduct[]): number {
  const ratings = products.map((p) => p.rating).filter((r): r is number => typeof r === "number" && r > 0);
  if (!ratings.length) return 0.5;
  return ratings.reduce((s, r) => s + r, 0) / ratings.length / 5;
}

function buildSignalHash(signals: Omit<DecisionSignalBundle, "signalHash">): string {
  return Object.entries(signals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(v * 1000)}`)
    .join("|");
}

export function buildDecisionSignals(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  coordination: IntentCoordinationMeta;
  fusion: IntentFusionMeta;
  reasoning: AdaptiveReasoningMeta;
}): DecisionSignalBundle {
  const { products, canonicalQuery, governance, calibration, runtime, orchestration, memory, coordination, fusion, reasoning } =
    args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.92;

  const calibrationScale = clamp(calibration.calibrationScore / 100, 0.5, 1);
  const trustStores = products.slice(0, 5).map((p) => getStoreTrustScore(p.store) / 100);
  const avgTrust = trustStores.length ? trustStores.reduce((s, t) => s + t, 0) / trustStores.length : 0.5;
  const lowTrustPenalty = trustStores.some((t) => t < 0.35) ? 0.15 : 0;

  const core = {
    trustScore: round3(avgTrust * reasoning.trustReasoning * 0.5 + fusion.trustFusion * 0.3 * governanceDampen),
    valueScore: round3((1 - canonicalQuery.budget.intent01 * 0.2) * reasoning.valueReasoning * 0.5 * calibrationScale),
    premiumScore: round3(canonicalQuery.intent.premium01 * reasoning.premiumReasoning * 0.5 * governanceDampen),
    budgetAlignment: round3(canonicalQuery.budget.intent01 * calibrationScale * governanceDampen),
    qualityConfidence: round3(avgRating(products) * reasoning.qualityReasoning * 0.5 * calibrationScale),
    urgencyConfidence: round3(canonicalQuery.intent.urgency01 * reasoning.urgencyReasoning * 0.5),
    comparisonConfidence: round3(
      reasoning.comparisonReasoning * fusion.analytics.comparisonFusionAnalytics * 0.01 * coordination.graphIntegrity * 0.01
    ),
    merchantReliability: round3(avgTrust * fusion.analytics.merchantFairnessAnalytics * 0.01 - lowTrustPenalty),
    deliveryConfidence: round3(
      canonicalQuery.intent.urgency01 * runtime.runtimeScore * 0.01 * fusion.urgencyFusion * 0.5
    ),
    discountAuthenticity: round3(
      (1 - lowTrustPenalty) * (1 - orchestration.suppressionBalance * 0.005) * governanceDampen
    ),
    returnRiskScore: round3(lowTrustPenalty + orchestration.suppressionBalance * 0.003),
    stabilityScore: round3(
      (orchestration.stabilizationScore * 0.01 +
        reasoning.analytics.commerceStabilityAnalytics * 0.01 +
        fusion.fusionScore * 0.01) /
        3
    ),
    recommendationStrength: round3(
      reasoning.recommendationReasoning * calibration.calibrationScore * 0.01 * calibrationScale
    ),
    rankingContinuity: round3(memory.continuityScore * 0.01 * reasoning.continuityStrength),
    replayIntegrity: round3(reasoning.replayIntegrity * 0.01 * fusion.replayIntegrity * 0.01),
  };

  return {
    ...core,
    signalHash: buildSignalHash(core),
  };
}

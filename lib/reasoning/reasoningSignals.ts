/**
 * P5.5 — Commerce reasoning signals (deterministic; no embeddings).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

export type ReasoningSignalBundle = {
  trust: number;
  value: number;
  budget: number;
  premium: number;
  quality: number;
  urgency: number;
  comparisonConfidence: number;
  recommendationStrength: number;
  merchantReliability: number;
  suppressionRecovery: number;
  diversityBalance: number;
  rankingContinuity: number;
  reviewConsistency: number;
  deliveryConfidence: number;
  commerceStability: number;
  reasoningConfidence: number;
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

function buildSignalHash(signals: Omit<ReasoningSignalBundle, "signalHash" | "reasoningConfidence">): string {
  return Object.entries(signals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(v * 1000)}`)
    .join("|");
}

export function buildReasoningSignals(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  coordination: IntentCoordinationMeta;
  fusion: IntentFusionMeta;
}): ReasoningSignalBundle {
  const { products, canonicalQuery, governance, calibration, runtime, orchestration, memory, coordination, fusion } =
    args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.92;

  const calibrationScale = clamp(calibration.calibrationScore / 100, 0.5, 1);
  const fusionScale = clamp(fusion.fusionScore / 100, 0.4, 1);
  const trustStores = products.slice(0, 5).map((p) => getStoreTrustScore(p.store) / 100);
  const avgTrust = trustStores.length ? trustStores.reduce((s, t) => s + t, 0) / trustStores.length : 0.5;

  const core = {
    trust: round3(avgTrust * fusion.trustFusion * 0.5 + orchestration.trustBalance * 0.005 * governanceDampen),
    value: round3((1 - canonicalQuery.budget.intent01 * 0.25) * fusion.valueFusion * 0.5 * calibrationScale),
    budget: round3(canonicalQuery.budget.intent01 * calibrationScale * governanceDampen),
    premium: round3(canonicalQuery.intent.premium01 * fusion.premiumFusion * 0.5 * governanceDampen),
    quality: round3(avgRating(products) * fusion.qualityFusion * 0.5 * calibrationScale),
    urgency: round3(canonicalQuery.intent.urgency01 * fusion.urgencyFusion * 0.5),
    comparisonConfidence: round3(fusion.analytics.comparisonFusionAnalytics * 0.01 * coordination.graphIntegrity * 0.01),
    recommendationStrength: round3(fusion.analytics.commerceConfidenceAnalytics * 0.01 * calibrationScale),
    merchantReliability: round3(avgTrust * fusion.analytics.merchantFairnessAnalytics * 0.01),
    suppressionRecovery: round3(fusion.suppressionRecovery * governanceDampen),
    diversityBalance: round3(fusion.diversityBalance * governanceDampen),
    rankingContinuity: round3(memory.continuityScore * 0.01 * fusion.rankingContinuity),
    reviewConsistency: round3(avgRating(products) * memory.replayMemoryIntegrity * 0.01),
    deliveryConfidence: round3(
      canonicalQuery.intent.urgency01 * runtime.runtimeScore * 0.01 * fusionScale
    ),
    commerceStability: round3(
      (orchestration.stabilizationScore * 0.01 + coordination.reasoningStability * 0.01 + fusion.fusionScore * 0.01) / 3
    ),
  };

  const reasoningConfidence = round3(
    clamp(
      (core.trust * 0.12 +
        core.value * 0.08 +
        core.quality * 0.1 +
        core.rankingContinuity * 0.15 +
        core.commerceStability * 0.15 +
        core.comparisonConfidence * 0.1 +
        core.recommendationStrength * 0.1 +
        fusion.fusionConfidence * 0.2) *
        governanceDampen,
      0,
      1
    )
  );

  return {
    ...core,
    reasoningConfidence,
    signalHash: buildSignalHash(core),
  };
}

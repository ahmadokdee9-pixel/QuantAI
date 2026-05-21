/**
 * P5.4 — Multi-signal commerce fusion (deterministic; no embeddings).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getStoreTrustScore } from "@/lib/retailTrust";

export type CommerceFusionSignals = {
  trust: number;
  value: number;
  budget: number;
  premium: number;
  quality: number;
  urgency: number;
  merchantReputation: number;
  suppression: number;
  diversity: number;
  recommendationConfidence: number;
  comparisonQuality: number;
  deliveryReliability: number;
  reviewStrength: number;
  productStability: number;
  rankingContinuity: number;
};

export type FusedCommerceSignals = CommerceFusionSignals & {
  fusionConfidence: number;
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

function merchantFairness(products: QuantProduct[]): number {
  const stores = products.slice(0, 5).map((p) => p.store.toLowerCase());
  const unique = new Set(stores).size;
  return clamp(unique / Math.max(1, stores.length), 0, 1);
}

function buildSignalHash(signals: CommerceFusionSignals): string {
  return Object.entries(signals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(v * 1000)}`)
    .join("|");
}

export function fuseCommerceSignals(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  coordination: IntentCoordinationMeta;
}): FusedCommerceSignals {
  const { products, canonicalQuery, governance, calibration, runtime, orchestration, memory, coordination } = args;

  let governanceDampen = 1;
  if (governance.anomalyDetected) governanceDampen = 0.88;
  if (governance.blockedPolicies.length > 0) governanceDampen *= 0.92;

  const calibrationScale = clamp(calibration.calibrationScore / 100, 0.5, 1);
  const orchestrationScale = clamp(orchestration.stabilizationScore / 100, 0.5, 1);
  const memoryScale = clamp(memory.continuityScore / 100, 0.4, 1);
  const coordinationDampen = coordination.routingLane === "conflict" ? 0.85 : 1;

  const trustStores = products.slice(0, 5).map((p) => getStoreTrustScore(p.store) / 100);
  const avgTrust = trustStores.length ? trustStores.reduce((s, t) => s + t, 0) / trustStores.length : 0.5;

  const signals: CommerceFusionSignals = {
    trust: round3(avgTrust * orchestration.trustBalance * 0.01 * governanceDampen),
    value: round3(
      (1 - clamp(canonicalQuery.budget.intent01, 0, 1) * 0.3) * calibrationScale * orchestrationScale
    ),
    budget: round3(canonicalQuery.budget.intent01 * calibrationScale * governanceDampen),
    premium: round3(canonicalQuery.intent.premium01 * orchestrationScale * governanceDampen),
    quality: round3(avgRating(products) * calibrationScale),
    urgency: round3(canonicalQuery.intent.urgency01 * runtime.runtimeScore * 0.01),
    merchantReputation: round3(avgTrust * merchantFairness(products)),
    suppression: round3(orchestration.suppressionBalance * 0.01 * governanceDampen),
    diversity: round3(orchestration.diversityBalance * 0.01 * merchantFairness(products)),
    recommendationConfidence: round3(calibration.calibrationScore * 0.01 * orchestration.confidenceNormalization * 0.01),
    comparisonQuality: round3(
      (canonicalQuery.intent.primary === "market_compare" || canonicalQuery.marketMode === "hybrid_compare"
        ? 0.8
        : 0.4) * coordinationDampen
    ),
    deliveryReliability: round3(
      (canonicalQuery.intent.urgency01 > 0.4 ? 0.75 : 0.5) * runtime.runtimeScore * 0.01
    ),
    reviewStrength: round3(avgRating(products) * memoryScale),
    productStability: round3(orchestration.stabilizationScore * 0.01 * memoryScale),
    rankingContinuity: round3(memory.continuityScore * 0.01 * coordination.coordinationReplayIntegrity * 0.01),
  };

  const fusionConfidence = round3(
    clamp(
      (signals.trust * 0.15 +
        signals.value * 0.1 +
        signals.quality * 0.1 +
        signals.rankingContinuity * 0.15 +
        signals.productStability * 0.1 +
        signals.comparisonQuality * 0.1 +
        signals.merchantReputation * 0.1 +
        orchestration.orchestrationScore * 0.01 +
        coordination.reasoningStability * 0.01) *
        governanceDampen *
        calibrationScale,
      0,
      1
    )
  );

  return {
    ...signals,
    fusionConfidence,
    signalHash: buildSignalHash(signals),
  };
}

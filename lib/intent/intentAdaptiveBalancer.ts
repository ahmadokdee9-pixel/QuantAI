/**
 * P5.1 — Adaptive cross-signal balancing (deterministic, bounded).
 */

import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentEvaluationMeta } from "@/lib/intent/intentEvaluationEngine";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import {
  INTENT_ORCH_MAX_DIVERSITY_INTERVENTION,
  INTENT_ORCH_MAX_SUPPRESSION_CORRECTION,
  INTENT_ORCH_MAX_TRUST_REBALANCE,
} from "@/lib/intent/intentOrchestrationFlags";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getMarketplaceSellerRiskTier, getStoreTrustScore } from "@/lib/retailTrust";

export type AdaptiveBalanceResult = {
  adaptiveBalanceScore: number;
  confidenceNormalization: number;
  trustBalance: number;
  suppressionBalance: number;
  diversityBalance: number;
  stabilizationScore: number;
  driftCompensation: number;
  signalConflicts: string[];
  warnings: string[];
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function computeAdaptiveBalance(args: {
  evaluation: IntentEvaluationMeta;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  products: QuantProduct[];
}): AdaptiveBalanceResult {
  const { evaluation, governance, calibration, runtime, products } = args;
  const signalConflicts: string[] = [];
  const warnings: string[] = [];

  const confDist = calibration.analytics.confidenceDistribution;
  let confidenceNormalization = 0.72;
  if (confDist.high > 0) confidenceNormalization += 0.08;
  if (confDist.low > 0) {
    confidenceNormalization -= 0.1;
    warnings.push("confidence_normalization");
  }
  confidenceNormalization = clamp(confidenceNormalization, 0.35, 1);

  let trustBalance = clamp(
    (governance.trustSafety / 100) * calibration.trustWeight * (1 - runtime.trustApplied * 0.02),
    0.35,
    INTENT_ORCH_MAX_TRUST_REBALANCE
  );
  if (runtime.monitoring.trustRisk) {
    trustBalance *= 0.9;
    signalConflicts.push("trust_runtime_conflict");
  }

  let suppressionBalance = clamp(
    (evaluation.analytics.suppressionPrecision / 100) * calibration.suppressionWeight,
    0.35,
    INTENT_ORCH_MAX_SUPPRESSION_CORRECTION
  );
  if (runtime.monitoring.suppressionAnomaly) {
    suppressionBalance *= 0.88;
    signalConflicts.push("suppression_runtime_conflict");
  }

  const stores = new Set(products.slice(0, 5).map((p) => p.store.toLowerCase()));
  let diversityBalance = clamp(
    (evaluation.dimensions.merchantIntegrity / 100) * calibration.diversityWeight,
    0.35,
    INTENT_ORCH_MAX_DIVERSITY_INTERVENTION
  );
  if (stores.size < 2 && products.length >= 3) {
    diversityBalance = clamp(diversityBalance * 1.12, 0.35, INTENT_ORCH_MAX_DIVERSITY_INTERVENTION);
    warnings.push("merchant_fairness_balancing");
  }

  const driftCompensation = clamp(
    runtime.analytics.appliedVsBaselineDelta > 0
      ? calibration.driftWeight * 0.15 * runtime.analytics.appliedVsBaselineDelta
      : 0,
    0,
    0.5
  );

  let stabilizationScore = clampScore(
    runtime.analytics.stabilityScoring * 0.35 +
      governance.governanceScore * 0.25 +
      calibration.calibrationScore * 0.2 +
      (100 - signalConflicts.length * 12) * 0.2
  );
  if (runtime.monitoring.runtimeInstability) {
    stabilizationScore -= 15;
    warnings.push("instability_dampening");
  }
  if (governance.anomalyDetected) {
    stabilizationScore -= 10;
    signalConflicts.push("governance_anomaly");
  }

  const adaptiveBalanceScore = clampScore(
    confidenceNormalization * 22 +
      trustBalance * 18 +
      suppressionBalance * 16 +
      diversityBalance * 16 +
      stabilizationScore * 0.28
  );

  return {
    adaptiveBalanceScore,
    confidenceNormalization: Math.round(confidenceNormalization * 1000) / 1000,
    trustBalance: Math.round(trustBalance * 1000) / 1000,
    suppressionBalance: Math.round(suppressionBalance * 1000) / 1000,
    diversityBalance: Math.round(diversityBalance * 1000) / 1000,
    stabilizationScore,
    driftCompensation: Math.round(driftCompensation * 1000) / 1000,
    signalConflicts: signalConflicts.slice(0, 6),
    warnings: warnings.slice(0, 8),
  };
}

export function computeOrchestrationProductAdjustments(args: {
  products: QuantProduct[];
  balance: AdaptiveBalanceResult;
  profile: ReturnType<typeof import("@/lib/intent/intentOrchestrationProfiles").resolveOrchestrationProfile>;
}): { index: number; adjustment: number }[] {
  const { products, balance, profile } = args;
  const storeCounts = new Map<string, number>();
  for (const p of products) {
    const k = p.store.toLowerCase();
    storeCounts.set(k, (storeCounts.get(k) ?? 0) + 1);
  }
  const dominant = [...storeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return products.map((p, index) => {
    let adjustment = 0;
    const trust = getStoreTrustScore(p.store);
    const risk = getMarketplaceSellerRiskTier(p.store, p.title);

    if (trust >= 75) adjustment += balance.trustBalance * 0.4;
    if (risk === "high") adjustment -= balance.suppressionBalance * 0.5;

    if (dominant && p.store.toLowerCase() !== dominant) {
      adjustment += balance.diversityBalance * 0.25;
    }

    adjustment -= balance.driftCompensation * 0.2;
    adjustment *= balance.confidenceNormalization;
    adjustment = clamp(adjustment, -profile.maxDelta, profile.maxDelta);

    return { index, adjustment: Math.round(adjustment * 1000) / 1000 };
  });
}

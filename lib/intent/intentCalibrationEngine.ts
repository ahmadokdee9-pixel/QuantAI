/**
 * P4.9 — Adaptive intelligence calibration & controlled decision calibration (meta-only).
 */

import type { IntentApplyMeta } from "@/lib/intent/intentApply";
import type { IntentEvaluationMeta } from "@/lib/intent/intentEvaluationEngine";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentObservabilityMeta } from "@/lib/intent/intentObservability";
import type { IntentProductionApplyMeta } from "@/lib/intent/intentProductionApply";
import { INTENT_OBS_MAX_DRIFT } from "@/lib/intent/intentObservabilityFlags";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  INTENT_CAL_MIN_CALIBRATION_SCORE,
  INTENT_CAL_WEIGHT_MAX,
  INTENT_CAL_WEIGHT_MIN,
  INTENT_CALIBRATION_VERSION,
  isIntentCalibrationAdvisoryOnly,
  isIntentCalibrationAutonomousBlocked,
  isIntentCalibrationEnabled,
} from "@/lib/intent/intentCalibrationFlags";
import {
  resolveCalibrationProfile,
  type IntentCalibrationProfileId,
} from "@/lib/intent/intentCalibrationProfiles";

export type IntentCalibrationDimensions = {
  confidenceCalibration: number;
  suppressionCalibration: number;
  trustCalibration: number;
  comparisonCalibration: number;
  merchantDiversityCalibration: number;
  rankingStabilityCalibration: number;
  budgetIntentCalibration: number;
};

export type IntentCalibrationAnalytics = {
  calibrationEffectiveness: number;
  confidenceDistribution: { low: number; medium: number; high: number };
  trustCalibrationQuality: number;
  suppressionPrecision: number;
  rankingStabilizationMetrics: number;
  diversityPreservationMetrics: number;
};

export type IntentCalibrationMonitoring = {
  unstableCalibration: boolean;
  overCalibration: boolean;
  suppressionImbalance: boolean;
  trustOverweight: boolean;
  comparisonInstability: boolean;
};

export type IntentCalibrationMeta = {
  version: typeof INTENT_CALIBRATION_VERSION;
  active: boolean;
  advisoryOnly: true;
  autonomousBlocked: true;
  profileId: IntentCalibrationProfileId;
  dimensions: IntentCalibrationDimensions;
  analytics: IntentCalibrationAnalytics;
  monitoring: IntentCalibrationMonitoring;
  calibrationScore: number;
  confidenceWeight: number;
  suppressionWeight: number;
  trustWeight: number;
  comparisonWeight: number;
  diversityWeight: number;
  driftWeight: number;
  stabilityWeight: number;
  calibrationWarnings: string[];
  calibrationAnomalies: string[];
  rollbackCalibrationReason: string | null;
  latencyMs: number;
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function clampWeight(n: number): number {
  return Math.min(INTENT_CAL_WEIGHT_MAX, Math.max(INTENT_CAL_WEIGHT_MIN, Math.round(n * 1000) / 1000));
}

function scoreConfidenceCalibration(evaluation: IntentEvaluationMeta, observability: IntentObservabilityMeta): number {
  const dist = observability.confidenceDistribution;
  let score = 65 + dist.high * 18 - dist.low * 12;
  if (evaluation.monitors.lowConfidenceApplyWarning) score -= 15;
  return clampScore(score);
}

function scoreSuppressionCalibration(evaluation: IntentEvaluationMeta): number {
  return clampScore((evaluation.dimensions.suppressionEffectiveness + evaluation.analytics.suppressionPrecision) / 2);
}

function scoreTrustCalibration(evaluation: IntentEvaluationMeta, governance: IntentGovernanceMeta): number {
  return clampScore((evaluation.dimensions.trustQuality + governance.trustSafety) / 2);
}

function scoreComparisonCalibration(evaluation: IntentEvaluationMeta): number {
  return clampScore(evaluation.dimensions.comparisonAccuracy);
}

function scoreMerchantDiversityCalibration(
  evaluation: IntentEvaluationMeta,
  products: QuantProduct[]
): number {
  const stores = new Set(products.slice(0, 5).map((p) => p.store.toLowerCase()));
  let score = evaluation.dimensions.merchantIntegrity;
  if (stores.size >= 3) score += 8;
  if (evaluation.monitors.merchantDiversityWarning) score -= 18;
  return clampScore(score);
}

function scoreRankingStabilityCalibration(
  evaluation: IntentEvaluationMeta,
  observability: IntentObservabilityMeta,
  rankingStable: boolean
): number {
  let score = evaluation.dimensions.rankingQuality;
  if (!rankingStable) score -= 25;
  if (observability.driftCount > INTENT_OBS_MAX_DRIFT) score -= 20;
  return clampScore(score);
}

function scoreBudgetIntentCalibration(evaluation: IntentEvaluationMeta): number {
  return clampScore(evaluation.dimensions.budgetAlignment);
}

function applyAdaptiveWeighting(args: {
  base: ReturnType<typeof resolveCalibrationProfile>["weights"];
  evaluation: IntentEvaluationMeta;
  governance: IntentGovernanceMeta;
  observability: IntentObservabilityMeta;
  rankingStable: boolean;
}): {
  confidenceWeight: number;
  suppressionWeight: number;
  trustWeight: number;
  comparisonWeight: number;
  diversityWeight: number;
  driftWeight: number;
  stabilityWeight: number;
  warnings: string[];
  anomalies: string[];
} {
  const { base, evaluation, governance, observability, rankingStable } = args;
  const warnings: string[] = [];
  const anomalies: string[] = [];

  let confidenceWeight = base.confidenceWeight;
  let suppressionWeight = base.suppressionWeight;
  let trustWeight = base.trustWeight;
  let comparisonWeight = base.comparisonWeight;
  let diversityWeight = base.diversityWeight;
  let driftWeight = base.driftWeight;
  let stabilityWeight = base.stabilityWeight;

  // low-confidence dampening
  if (evaluation.monitors.lowConfidenceApplyWarning || observability.confidenceDistribution.low > 0) {
    confidenceWeight = clampWeight(confidenceWeight * 0.88);
    warnings.push("low_confidence_dampening");
  }

  // high-trust boosting (advisory weight only)
  if (evaluation.dimensions.trustQuality >= 78 && governance.trustSafety >= 70) {
    trustWeight = clampWeight(trustWeight * 1.06);
    warnings.push("high_trust_boost_advisory");
  }

  // suppression balancing
  if (evaluation.monitors.excessiveSuppressionWarning) {
    suppressionWeight = clampWeight(suppressionWeight * 0.9);
    warnings.push("suppression_balancing");
  } else if (evaluation.analytics.suppressionPrecision >= 90) {
    suppressionWeight = clampWeight(suppressionWeight * 1.02);
  }

  // comparison normalization
  if (evaluation.dimensions.comparisonAccuracy < 58) {
    comparisonWeight = clampWeight(comparisonWeight * 0.92);
    warnings.push("comparison_normalization");
  }

  // merchant diversity balancing
  if (evaluation.monitors.merchantDiversityWarning) {
    diversityWeight = clampWeight(diversityWeight * 1.08);
    warnings.push("merchant_diversity_balancing");
  }

  // drift-aware calibration
  const driftRatio = observability.driftCount / INTENT_OBS_MAX_DRIFT;
  if (driftRatio > 0) {
    driftWeight = clampWeight(driftWeight * (1 + driftRatio * 0.08));
    stabilityWeight = clampWeight(stabilityWeight * (1 + driftRatio * 0.06));
    warnings.push("drift_aware_calibration");
  }

  // anomaly-aware stabilization
  if (governance.anomalyDetected) {
    stabilityWeight = clampWeight(stabilityWeight * 1.1);
    confidenceWeight = clampWeight(confidenceWeight * 0.94);
    anomalies.push("governance_anomaly_stabilization");
  }
  if (!rankingStable) {
    stabilityWeight = clampWeight(stabilityWeight * 1.12);
    anomalies.push("unstable_ranking_stabilization");
  }

  if (trustWeight > 0.85) warnings.push("trust_weight_elevated");
  if (driftWeight > 0.9) warnings.push("drift_weight_elevated");

  return {
    confidenceWeight,
    suppressionWeight,
    trustWeight,
    comparisonWeight,
    diversityWeight,
    driftWeight,
    stabilityWeight,
    warnings: warnings.slice(0, 8),
    anomalies: anomalies.slice(0, 6),
  };
}

function buildMonitoring(args: {
  weights: ReturnType<typeof applyAdaptiveWeighting>;
  dimensions: IntentCalibrationDimensions;
  governance: IntentGovernanceMeta;
}): IntentCalibrationMonitoring {
  const { weights, dimensions, governance } = args;
  const weightSpread =
    Math.max(
      weights.confidenceWeight,
      weights.suppressionWeight,
      weights.trustWeight,
      weights.comparisonWeight,
      weights.diversityWeight,
      weights.driftWeight,
      weights.stabilityWeight
    ) -
    Math.min(
      weights.confidenceWeight,
      weights.suppressionWeight,
      weights.trustWeight,
      weights.comparisonWeight,
      weights.diversityWeight,
      weights.driftWeight,
      weights.stabilityWeight
    );

  return {
    unstableCalibration: governance.monitoring.rankingInstability || dimensions.rankingStabilityCalibration < 55,
    overCalibration: weightSpread > 0.28 || weights.anomalies.length >= 2,
    suppressionImbalance: weights.suppressionWeight > 0.82 && dimensions.suppressionCalibration < 65,
    trustOverweight: weights.trustWeight > 0.85,
    comparisonInstability: dimensions.comparisonCalibration < 55,
  };
}

function deriveRollbackCalibrationReason(args: {
  disabled: boolean;
  evaluation: IntentEvaluationMeta;
  governance: IntentGovernanceMeta;
  productionApply: IntentProductionApplyMeta;
}): string | null {
  const { disabled, evaluation, governance, productionApply } = args;
  if (disabled) return "calibration_disabled";
  if (!evaluation.active) return "evaluation_inactive";
  if (governance.rollbackGovernanceReason) return `governance:${governance.rollbackGovernanceReason}`;
  if (productionApply.blockedInProduction) return "production_blocked";
  return null;
}

export function buildIntentCalibrationMeta(args: {
  evaluation: IntentEvaluationMeta;
  governance: IntentGovernanceMeta;
  observability: IntentObservabilityMeta;
  intentApply: IntentApplyMeta;
  productionApply: IntentProductionApplyMeta;
  products: QuantProduct[];
  rankingStable?: boolean;
}): IntentCalibrationMeta {
  const started = Date.now();
  const {
    evaluation,
    governance,
    observability,
    productionApply,
    products,
    rankingStable = observability.rankingStable,
  } = args;

  const emptyDimensions: IntentCalibrationDimensions = {
    confidenceCalibration: 0,
    suppressionCalibration: 0,
    trustCalibration: 0,
    comparisonCalibration: 0,
    merchantDiversityCalibration: 0,
    rankingStabilityCalibration: 0,
    budgetIntentCalibration: 0,
  };

  const emptyAnalytics: IntentCalibrationAnalytics = {
    calibrationEffectiveness: 0,
    confidenceDistribution: { low: 0, medium: 0, high: 0 },
    trustCalibrationQuality: 0,
    suppressionPrecision: 0,
    rankingStabilizationMetrics: 0,
    diversityPreservationMetrics: 0,
  };

  const emptyMonitoring: IntentCalibrationMonitoring = {
    unstableCalibration: false,
    overCalibration: false,
    suppressionImbalance: false,
    trustOverweight: false,
    comparisonInstability: false,
  };

  if (!isIntentCalibrationEnabled()) {
    return {
      version: INTENT_CALIBRATION_VERSION,
      active: false,
      advisoryOnly: true,
      autonomousBlocked: true,
      profileId: "balanced_v1",
      dimensions: emptyDimensions,
      analytics: emptyAnalytics,
      monitoring: emptyMonitoring,
      calibrationScore: 0,
      confidenceWeight: 0,
      suppressionWeight: 0,
      trustWeight: 0,
      comparisonWeight: 0,
      diversityWeight: 0,
      driftWeight: 0,
      stabilityWeight: 0,
      calibrationWarnings: [],
      calibrationAnomalies: [],
      rollbackCalibrationReason: "calibration_disabled",
      latencyMs: Date.now() - started,
    };
  }

  const profile = resolveCalibrationProfile({
    governanceScore: governance.governanceScore,
    anomalyDetected: governance.anomalyDetected,
    driftCount: observability.driftCount,
  });

  const dimensions: IntentCalibrationDimensions = {
    confidenceCalibration: scoreConfidenceCalibration(evaluation, observability),
    suppressionCalibration: scoreSuppressionCalibration(evaluation),
    trustCalibration: scoreTrustCalibration(evaluation, governance),
    comparisonCalibration: scoreComparisonCalibration(evaluation),
    merchantDiversityCalibration: scoreMerchantDiversityCalibration(evaluation, products),
    rankingStabilityCalibration: scoreRankingStabilityCalibration(evaluation, observability, rankingStable),
    budgetIntentCalibration: scoreBudgetIntentCalibration(evaluation),
  };

  const weights = applyAdaptiveWeighting({
    base: profile.weights,
    evaluation,
    governance,
    observability,
    rankingStable,
  });

  const analytics: IntentCalibrationAnalytics = {
    calibrationEffectiveness: clampScore(
      (dimensions.confidenceCalibration * weights.confidenceWeight +
        dimensions.trustCalibration * weights.trustWeight +
        dimensions.rankingStabilityCalibration * weights.stabilityWeight) /
        (weights.confidenceWeight + weights.trustWeight + weights.stabilityWeight || 1)
    ),
    confidenceDistribution: { ...observability.confidenceDistribution },
    trustCalibrationQuality: dimensions.trustCalibration,
    suppressionPrecision: evaluation.analytics.suppressionPrecision,
    rankingStabilizationMetrics: clampScore(
      dimensions.rankingStabilityCalibration * weights.stabilityWeight * 100
    ),
    diversityPreservationMetrics: clampScore(
      dimensions.merchantDiversityCalibration * weights.diversityWeight * 100
    ),
  };

  const monitoring = buildMonitoring({ weights, dimensions, governance });

  const calibrationScore = clampScore(
    dimensions.confidenceCalibration * 0.14 * weights.confidenceWeight +
      dimensions.suppressionCalibration * 0.14 * weights.suppressionWeight +
      dimensions.trustCalibration * 0.16 * weights.trustWeight +
      dimensions.comparisonCalibration * 0.1 * weights.comparisonWeight +
      dimensions.merchantDiversityCalibration * 0.14 * weights.diversityWeight +
      dimensions.rankingStabilityCalibration * 0.16 * weights.stabilityWeight +
      dimensions.budgetIntentCalibration * 0.1 +
      analytics.calibrationEffectiveness * 0.06
  );

  const calibrationWarnings = [...weights.warnings];
  if (monitoring.unstableCalibration) calibrationWarnings.push("unstable_calibration_detected");
  if (monitoring.overCalibration) calibrationWarnings.push("over_calibration_detected");
  if (monitoring.suppressionImbalance) calibrationWarnings.push("suppression_imbalance_detected");
  if (monitoring.trustOverweight) calibrationWarnings.push("trust_overweight_detected");
  if (monitoring.comparisonInstability) calibrationWarnings.push("comparison_instability_detected");

  if (evaluation.monitors.lowConfidenceApplyWarning) {
    calibrationWarnings.push("confidence_below_apply_floor");
  }

  const rollbackCalibrationReason = deriveRollbackCalibrationReason({
    disabled: false,
    evaluation,
    governance,
    productionApply,
  });

  return {
    version: INTENT_CALIBRATION_VERSION,
    active: evaluation.active && governance.advisoryOnly,
    advisoryOnly: true,
    autonomousBlocked: true,
    profileId: profile.id,
    dimensions,
    analytics,
    monitoring,
    calibrationScore,
    confidenceWeight: weights.confidenceWeight,
    suppressionWeight: weights.suppressionWeight,
    trustWeight: weights.trustWeight,
    comparisonWeight: weights.comparisonWeight,
    diversityWeight: weights.diversityWeight,
    driftWeight: weights.driftWeight,
    stabilityWeight: weights.stabilityWeight,
    calibrationWarnings: calibrationWarnings.slice(0, 10),
    calibrationAnomalies: weights.anomalies,
    rollbackCalibrationReason,
    latencyMs: Date.now() - started,
  };
}

export function aggregateIntentCalibration(
  rows: { trayId: string; calibration: IntentCalibrationMeta }[]
): {
  avgCalibrationScore: number;
  profileCounts: Record<string, number>;
  anomalyTrays: string[];
} {
  const profileCounts: Record<string, number> = {};
  const anomalyTrays: string[] = [];
  let sum = 0;

  for (const row of rows) {
    sum += row.calibration.calibrationScore;
    profileCounts[row.calibration.profileId] = (profileCounts[row.calibration.profileId] ?? 0) + 1;
    if (row.calibration.calibrationAnomalies.length > 0) anomalyTrays.push(row.trayId);
  }

  return {
    avgCalibrationScore: rows.length ? clampScore(sum / rows.length) : 0,
    profileCounts,
    anomalyTrays,
  };
}

export {
  isIntentCalibrationEnabled,
  isIntentCalibrationAdvisoryOnly,
  isIntentCalibrationAutonomousBlocked,
  INTENT_CAL_MIN_CALIBRATION_SCORE,
};

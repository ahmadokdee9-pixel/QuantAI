/**
 * P4.7 — Safe optimization recommendation engine (advisory telemetry only).
 * Consumes P4.6 evaluation metrics; never applies threshold changes or ranking mutations.
 */

import type { IntentEvaluationMeta } from "@/lib/intent/intentEvaluationEngine";
import { aggregateIntentEvaluations } from "@/lib/intent/intentEvaluationEngine";
import {
  INTENT_APPLY_CONFIDENCE_MIN,
  INTENT_APPLY_COHERENCE_MIN,
  INTENT_APPLY_PRESTIGE_MIN,
} from "@/lib/intent/intentIntelligenceFlags";
import { INTENT_OBS_MAX_DRIFT, INTENT_OBS_SUPPRESSION_RATE_MAX } from "@/lib/intent/intentObservabilityFlags";
import {
  INTENT_OPT_MIN_CONFIDENCE,
  INTENT_OPT_MIN_EVAL_QUALITY,
  INTENT_OPTIMIZATION_VERSION,
  isIntentOptimizationAutonomousBlocked,
  isIntentOptimizationEnabled,
} from "@/lib/intent/intentOptimizationFlags";

export type OptimizationRiskLevel = "low" | "medium" | "high";

export type OptimizationRecommendation = {
  id: string;
  category: "trust" | "drift" | "suppression" | "budget" | "merchant" | "confidence" | "canary" | "integrity";
  parameter: string;
  currentValue: string | number;
  suggestedValue: string | number;
  direction: "increase" | "decrease" | "hold" | "review";
  rationale: string;
  advisoryOnly: true;
};

export type IntentOptimizationReports = {
  driftQuality: number;
  trustRetention: number;
  suppressionPrecision: number;
  budgetMatch: number;
  merchantDiversity: number;
  qualityScore: number;
};

export type IntentOptimizationMeta = {
  version: typeof INTENT_OPTIMIZATION_VERSION;
  active: boolean;
  advisoryOnly: true;
  autonomousApplyBlocked: true;
  recommendations: OptimizationRecommendation[];
  weakTraySignals: string[];
  confidence: number;
  riskLevel: OptimizationRiskLevel;
  skippedReason: string | null;
  reports: IntentOptimizationReports;
  latencyMs: number;
};

function clamp(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function pushRecommendation(
  list: OptimizationRecommendation[],
  rec: Omit<OptimizationRecommendation, "advisoryOnly">
): void {
  list.push({ ...rec, advisoryOnly: true });
}

function deriveRiskLevel(args: {
  monitors: IntentEvaluationMeta["monitors"];
  qualityScore: number;
  recommendationCount: number;
}): OptimizationRiskLevel {
  const { monitors, qualityScore, recommendationCount } = args;
  const severe =
    monitors.trustMismatchWarning ||
    monitors.unstableRankingWarning ||
    monitors.excessiveSuppressionWarning;
  if (severe && qualityScore < INTENT_OPT_MIN_EVAL_QUALITY) return "high";
  if (severe || recommendationCount >= 4 || qualityScore < 58) return "medium";
  return "low";
}

function deriveOptimizationConfidence(args: {
  evaluation: IntentEvaluationMeta;
  recommendationCount: number;
}): number {
  const { evaluation, recommendationCount } = args;
  let score =
    evaluation.qualityScore * 0.35 +
    evaluation.explanationCompleteness * 0.2 +
    evaluation.analytics.suppressionPrecision * 0.15 +
    evaluation.analytics.driftQualityScore * 0.15 +
    evaluation.trustScore * 0.15;
  if (!evaluation.active) score -= 40;
  if (recommendationCount > 5) score -= 8;
  return clamp(score);
}

export function buildIntentOptimizationMeta(args: {
  trayId?: string;
  evaluation: IntentEvaluationMeta;
  aggregateContext?: ReturnType<typeof aggregateIntentEvaluations>;
}): IntentOptimizationMeta {
  const started = Date.now();
  const { trayId, evaluation, aggregateContext } = args;

  const emptyReports: IntentOptimizationReports = {
    driftQuality: 0,
    trustRetention: 0,
    suppressionPrecision: 0,
    budgetMatch: 0,
    merchantDiversity: 0,
    qualityScore: 0,
  };

  if (!isIntentOptimizationEnabled()) {
    return {
      version: INTENT_OPTIMIZATION_VERSION,
      active: false,
      advisoryOnly: true,
      autonomousApplyBlocked: true,
      recommendations: [],
      weakTraySignals: [],
      confidence: 0,
      riskLevel: "low",
      skippedReason: "optimization_disabled",
      reports: emptyReports,
      latencyMs: Date.now() - started,
    };
  }

  if (!evaluation.active || evaluation.qualityScore === 0) {
    return {
      version: INTENT_OPTIMIZATION_VERSION,
      active: false,
      advisoryOnly: true,
      autonomousApplyBlocked: true,
      recommendations: [],
      weakTraySignals: [],
      confidence: 0,
      riskLevel: "low",
      skippedReason: "evaluation_inactive",
      reports: emptyReports,
      latencyMs: Date.now() - started,
    };
  }

  const reports: IntentOptimizationReports = {
    driftQuality: evaluation.analytics.driftQualityScore,
    trustRetention: evaluation.analytics.trustedMerchantRetention,
    suppressionPrecision: evaluation.analytics.suppressionPrecision,
    budgetMatch: evaluation.dimensions.budgetAlignment,
    merchantDiversity: evaluation.dimensions.merchantIntegrity,
    qualityScore: evaluation.qualityScore,
  };

  if (evaluation.qualityScore < INTENT_OPT_MIN_EVAL_QUALITY) {
    return {
      version: INTENT_OPTIMIZATION_VERSION,
      active: true,
      advisoryOnly: true,
      autonomousApplyBlocked: true,
      recommendations: [],
      weakTraySignals: trayId && aggregateContext?.lowestQualityTrays.includes(trayId) ? [trayId] : [],
      confidence: clamp(evaluation.qualityScore),
      riskLevel: "high",
      skippedReason: "insufficient_evaluation_quality",
      reports,
      latencyMs: Date.now() - started,
    };
  }

  const recommendations: OptimizationRecommendation[] = [];
  const weakTraySignals: string[] = [];
  const { monitors, dimensions, analytics } = evaluation;

  if (trayId && aggregateContext?.lowestQualityTrays.includes(trayId)) {
    weakTraySignals.push(trayId);
    pushRecommendation(recommendations, {
      id: "weak_tray_review",
      category: "integrity",
      parameter: "tray_quality_review",
      currentValue: evaluation.qualityScore,
      suggestedValue: INTENT_OPT_MIN_EVAL_QUALITY + 10,
      direction: "review",
      rationale: `Tray ${trayId} in lowest-quality cohort; review intent signals and listing mix before threshold changes.`,
    });
  }

  if (monitors.merchantDiversityWarning || dimensions.merchantIntegrity < 58) {
    pushRecommendation(recommendations, {
      id: "merchant_diversity",
      category: "merchant",
      parameter: "merchant_diversity_target",
      currentValue: dimensions.merchantIntegrity,
      suggestedValue: 65,
      direction: "review",
      rationale: "Low merchant diversity in top results; widen discovery breadth before tightening apply thresholds.",
    });
  }

  if (monitors.excessiveSuppressionWarning || analytics.suppressionPrecision < 70) {
    pushRecommendation(recommendations, {
      id: "suppression_rate_cap",
      category: "suppression",
      parameter: "INTENT_OBS_SUPPRESSION_RATE_MAX",
      currentValue: INTENT_OBS_SUPPRESSION_RATE_MAX,
      suggestedValue: 0.65,
      direction: "decrease",
      rationale: "Suppression precision or rate signals over-suppression; advisory lower cap (report-only, not applied).",
    });
  } else if (analytics.suppressionPrecision >= 92 && dimensions.suppressionEffectiveness >= 80) {
    pushRecommendation(recommendations, {
      id: "suppression_hold",
      category: "suppression",
      parameter: "INTENT_OBS_SUPPRESSION_RATE_MAX",
      currentValue: INTENT_OBS_SUPPRESSION_RATE_MAX,
      suggestedValue: INTENT_OBS_SUPPRESSION_RATE_MAX,
      direction: "hold",
      rationale: "Suppression precision healthy; hold current observability suppression cap.",
    });
  }

  if (monitors.trustMismatchWarning || analytics.trustedMerchantRetention < 65) {
    pushRecommendation(recommendations, {
      id: "trust_confidence_floor",
      category: "trust",
      parameter: "INTENT_APPLY_CONFIDENCE_MIN",
      currentValue: INTENT_APPLY_CONFIDENCE_MIN,
      suggestedValue: Math.min(0.72, INTENT_APPLY_CONFIDENCE_MIN + 0.02),
      direction: "increase",
      rationale: "Trust mismatch or low trusted-merchant retention; advisory raise confidence floor (not applied).",
    });
  } else if (dimensions.trustQuality >= 78 && analytics.trustedMerchantRetention >= 75) {
    pushRecommendation(recommendations, {
      id: "trust_hold",
      category: "trust",
      parameter: "INTENT_APPLY_CONFIDENCE_MIN",
      currentValue: INTENT_APPLY_CONFIDENCE_MIN,
      suggestedValue: INTENT_APPLY_CONFIDENCE_MIN,
      direction: "hold",
      rationale: "Trust quality and retention within bounds; hold confidence minimum.",
    });
  }

  if (monitors.unstableRankingWarning || analytics.driftQualityScore < 62) {
    pushRecommendation(recommendations, {
      id: "drift_cap_hold",
      category: "drift",
      parameter: "INTENT_OBS_MAX_DRIFT",
      currentValue: INTENT_OBS_MAX_DRIFT,
      suggestedValue: INTENT_OBS_MAX_DRIFT,
      direction: "hold",
      rationale: "Drift or ranking instability detected; never increase drift cap—hold bounded apply ceiling.",
    });
  }

  if (dimensions.budgetAlignment < 58) {
    pushRecommendation(recommendations, {
      id: "budget_coherence",
      category: "budget",
      parameter: "INTENT_APPLY_COHERENCE_MIN",
      currentValue: INTENT_APPLY_COHERENCE_MIN,
      suggestedValue: Math.min(0.6, INTENT_APPLY_COHERENCE_MIN + 0.03),
      direction: "increase",
      rationale: "Budget intent alignment weak; advisory coherence review for institutional gates (report-only).",
    });
  }

  if (monitors.lowConfidenceApplyWarning) {
    pushRecommendation(recommendations, {
      id: "confidence_apply_guard",
      category: "confidence",
      parameter: "INTENT_APPLY_CONFIDENCE_MIN",
      currentValue: INTENT_APPLY_CONFIDENCE_MIN,
      suggestedValue: INTENT_APPLY_CONFIDENCE_MIN,
      direction: "hold",
      rationale: "Apply near confidence floor; hold threshold and defer production activation.",
    });
  }

  if (analytics.canaryOutcomeScore < 65) {
    pushRecommendation(recommendations, {
      id: "canary_stage_hold",
      category: "canary",
      parameter: "INTENT_CANARY_ROLLOUT_STAGE",
      currentValue: "current",
      suggestedValue: "hold",
      direction: "hold",
      rationale: "Canary outcome score below target; hold rollout stage until evaluation quality stabilizes.",
    });
  }

  if (dimensions.comparisonAccuracy < 55) {
    pushRecommendation(recommendations, {
      id: "prestige_integrity",
      category: "integrity",
      parameter: "INTENT_APPLY_PRESTIGE_MIN",
      currentValue: INTENT_APPLY_PRESTIGE_MIN,
      suggestedValue: INTENT_APPLY_PRESTIGE_MIN,
      direction: "review",
      rationale: "Comparison accuracy low; review prestige integrity gate before any threshold decrease.",
    });
  }

  const riskLevel = deriveRiskLevel({
    monitors,
    qualityScore: evaluation.qualityScore,
    recommendationCount: recommendations.length,
  });

  const confidence = deriveOptimizationConfidence({ evaluation, recommendationCount: recommendations.length });
  const skippedReason =
    confidence < INTENT_OPT_MIN_CONFIDENCE && recommendations.length === 0
      ? "low_optimization_confidence"
      : null;

  return {
    version: INTENT_OPTIMIZATION_VERSION,
    active: true,
    advisoryOnly: true,
    autonomousApplyBlocked: true,
    recommendations: recommendations.slice(0, 12),
    weakTraySignals,
    confidence,
    riskLevel,
    skippedReason,
    reports,
    latencyMs: Date.now() - started,
  };
}

/** Multi-tray advisory rollup for validation gates. */
export function aggregateIntentOptimizations(
  rows: { trayId: string; optimization: IntentOptimizationMeta }[]
): {
  recommendationCount: number;
  highRiskTrays: string[];
  weakTrays: string[];
  topRecommendations: string[];
} {
  const recCounts = new Map<string, number>();
  const highRiskTrays: string[] = [];
  const weakTrays = new Set<string>();

  for (const row of rows) {
    if (row.optimization.riskLevel === "high") highRiskTrays.push(row.trayId);
    for (const w of row.optimization.weakTraySignals) weakTrays.add(w);
    for (const r of row.optimization.recommendations) {
      recCounts.set(r.id, (recCounts.get(r.id) ?? 0) + 1);
    }
  }

  const topRecommendations = [...recCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  return {
    recommendationCount: rows.reduce((n, r) => n + r.optimization.recommendations.length, 0),
    highRiskTrays,
    weakTrays: [...weakTrays],
    topRecommendations,
  };
}

export { isIntentOptimizationEnabled, isIntentOptimizationAutonomousBlocked };

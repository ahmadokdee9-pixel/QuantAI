/**
 * P4.8 — Intelligence governance, policy enforcement, and autonomous safety controls (meta-only).
 */

import type { IntentApplyMeta } from "@/lib/intent/intentApply";
import type { IntentCanaryMeta } from "@/lib/intent/intentCanaryController";
import type { IntentEvaluationMeta } from "@/lib/intent/intentEvaluationEngine";
import type { IntentOptimizationMeta } from "@/lib/intent/intentOptimizationEngine";
import type { IntentObservabilityMeta } from "@/lib/intent/intentObservability";
import type { IntentProductionApplyMeta } from "@/lib/intent/intentProductionApply";
import { isIntentApplyHardRollback } from "@/lib/intent/intentIntelligenceFlags";
import { INTENT_OBS_MAX_DRIFT } from "@/lib/intent/intentObservabilityFlags";
import type { QuantProduct } from "@/lib/shoppingScore";
import {
  INTENT_GOV_MIN_GOVERNANCE_SCORE,
  INTENT_GOV_MIN_SUPPRESSION_SAFETY,
  INTENT_GOV_MIN_TRUST_SAFETY,
  INTENT_GOVERNANCE_VERSION,
  isIntentGovernanceAdvisoryOnly,
  isIntentGovernanceAutonomousBlocked,
  isIntentGovernanceEnabled,
} from "@/lib/intent/intentGovernanceFlags";
import {
  evaluateAllGovernancePolicies,
  type GovernancePolicyId,
  type PolicyEvaluationContext,
} from "@/lib/intent/intentPolicyRegistry";

export type IntentGovernanceDimensions = {
  confidenceGovernance: number;
  suppressionGovernance: number;
  trustRiskGovernance: number;
  merchantDiversityGovernance: number;
  rankingIntegrityGovernance: number;
  comparisonFairnessGovernance: number;
  anomalyGovernance: number;
};

export type IntentGovernanceMonitoring = {
  driftGovernance: boolean;
  trustCorruptionCheck: boolean;
  suppressionAnomaly: boolean;
  rankingInstability: boolean;
  merchantDiversityDegradation: boolean;
};

export type IntentGovernanceMeta = {
  version: typeof INTENT_GOVERNANCE_VERSION;
  active: boolean;
  advisoryOnly: true;
  autonomousBlocked: true;
  dimensions: IntentGovernanceDimensions;
  monitoring: IntentGovernanceMonitoring;
  governanceScore: number;
  integrityScore: number;
  suppressionSafety: number;
  trustSafety: number;
  merchantBalanceScore: number;
  anomalyDetected: boolean;
  governanceWarnings: string[];
  blockedPolicies: GovernancePolicyId[];
  rollbackGovernanceReason: string | null;
  latencyMs: number;
};

function clamp(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function scoreConfidenceGovernance(evaluation: IntentEvaluationMeta, observability: IntentObservabilityMeta): number {
  let score = 70;
  if (evaluation.monitors.lowConfidenceApplyWarning) score -= 22;
  if (observability.confidenceDistribution.high > 0) score += 12;
  if (observability.confidenceDistribution.low > 0) score -= 10;
  return clamp(score);
}

function scoreSuppressionGovernance(evaluation: IntentEvaluationMeta, observability: IntentObservabilityMeta): number {
  let score = evaluation.dimensions.suppressionEffectiveness;
  if (observability.overSuppression) score -= 25;
  score = (score + evaluation.analytics.suppressionPrecision) / 2;
  return clamp(score);
}

function scoreTrustRiskGovernance(evaluation: IntentEvaluationMeta): number {
  return clamp((evaluation.dimensions.trustQuality + evaluation.trustScore) / 2);
}

function scoreMerchantDiversityGovernance(evaluation: IntentEvaluationMeta, products: QuantProduct[]): number {
  const stores = new Set(products.slice(0, 5).map((p) => p.store.toLowerCase()));
  let score = evaluation.dimensions.merchantIntegrity;
  if (stores.size >= 3) score += 10;
  if (evaluation.monitors.merchantDiversityWarning) score -= 20;
  return clamp(score);
}

function scoreRankingIntegrityGovernance(
  evaluation: IntentEvaluationMeta,
  observability: IntentObservabilityMeta,
  rankingStable: boolean
): number {
  let score = evaluation.dimensions.rankingQuality;
  if (!rankingStable) score -= 28;
  if (observability.driftCount > INTENT_OBS_MAX_DRIFT) score -= 20;
  if (!observability.integrityPass) score -= 15;
  return clamp(score);
}

function scoreComparisonFairnessGovernance(evaluation: IntentEvaluationMeta): number {
  return clamp(evaluation.dimensions.comparisonAccuracy);
}

function scoreAnomalyGovernance(
  evaluation: IntentEvaluationMeta,
  observability: IntentObservabilityMeta,
  blockedCount: number
): number {
  let score = 88 - blockedCount * 12;
  score -= observability.instabilityWarnings.length * 5;
  if (evaluation.monitors.unstableRankingWarning) score -= 15;
  return clamp(score);
}

function buildMonitoring(args: {
  observability: IntentObservabilityMeta;
  evaluation: IntentEvaluationMeta;
  rankingStable: boolean;
  products: QuantProduct[];
  policyResults: ReturnType<typeof evaluateAllGovernancePolicies>;
}): IntentGovernanceMonitoring {
  const { observability, evaluation, rankingStable, products, policyResults } = args;
  const stores = new Set(products.slice(0, 5).map((p) => p.store.toLowerCase()));

  return {
    driftGovernance: observability.driftCount > 0 && observability.driftCount <= INTENT_OBS_MAX_DRIFT,
    trustCorruptionCheck: policyResults.some((p) => p.policyId === "trust_manipulation_prevention" && p.blocked),
    suppressionAnomaly: policyResults.some((p) => p.policyId === "unsafe_suppression_block" && p.blocked),
    rankingInstability: !rankingStable || observability.driftCount > INTENT_OBS_MAX_DRIFT,
    merchantDiversityDegradation: stores.size < 2 || evaluation.monitors.merchantDiversityWarning,
  };
}

function deriveRollbackGovernanceReason(args: {
  policyResults: ReturnType<typeof evaluateAllGovernancePolicies>;
  productionApply: IntentProductionApplyMeta;
  canary: IntentCanaryMeta;
  evaluation: IntentEvaluationMeta;
  disabled: boolean;
}): string | null {
  const { policyResults, productionApply, canary, evaluation, disabled } = args;
  if (disabled) return "governance_disabled";
  if (!evaluation.active) return "evaluation_inactive";
  if (isIntentApplyHardRollback()) return "hard_rollback";
  if (productionApply.blockedInProduction) return "production_blocked";
  if (canary.rollbackReason) return `canary:${canary.rollbackReason}`;
  const blocked = policyResults.filter((p) => p.blocked);
  if (blocked.length >= 3) return "policy_violation_aggregate";
  if (blocked.length > 0) return `policy:${blocked[0].policyId}`;
  return null;
}

export function buildIntentGovernanceMeta(args: {
  evaluation: IntentEvaluationMeta;
  optimization: IntentOptimizationMeta;
  observability: IntentObservabilityMeta;
  intentApply: IntentApplyMeta;
  productionApply: IntentProductionApplyMeta;
  canary: IntentCanaryMeta;
  products: QuantProduct[];
  rankingStable?: boolean;
}): IntentGovernanceMeta {
  const started = Date.now();
  const {
    evaluation,
    optimization,
    observability,
    intentApply,
    productionApply,
    canary,
    products,
    rankingStable = observability.rankingStable,
  } = args;

  const emptyDimensions: IntentGovernanceDimensions = {
    confidenceGovernance: 0,
    suppressionGovernance: 0,
    trustRiskGovernance: 0,
    merchantDiversityGovernance: 0,
    rankingIntegrityGovernance: 0,
    comparisonFairnessGovernance: 0,
    anomalyGovernance: 0,
  };

  const emptyMonitoring: IntentGovernanceMonitoring = {
    driftGovernance: false,
    trustCorruptionCheck: false,
    suppressionAnomaly: false,
    rankingInstability: false,
    merchantDiversityDegradation: false,
  };

  if (!isIntentGovernanceEnabled()) {
    return {
      version: INTENT_GOVERNANCE_VERSION,
      active: false,
      advisoryOnly: true,
      autonomousBlocked: true,
      dimensions: emptyDimensions,
      monitoring: emptyMonitoring,
      governanceScore: 0,
      integrityScore: 0,
      suppressionSafety: 0,
      trustSafety: 0,
      merchantBalanceScore: 0,
      anomalyDetected: false,
      governanceWarnings: [],
      blockedPolicies: [],
      rollbackGovernanceReason: "governance_disabled",
      latencyMs: Date.now() - started,
    };
  }

  const ctx: PolicyEvaluationContext = {
    evaluation,
    optimization,
    observability,
    intentApply,
    productionApply,
    canary,
    products,
    rankingStable,
  };

  const policyResults = evaluateAllGovernancePolicies(ctx);
  const blockedPolicies = policyResults.filter((p) => p.blocked).map((p) => p.policyId);
  const governanceWarnings = policyResults
    .map((p) => p.warning)
    .filter((w): w is string => w != null)
    .slice(0, 8);

  const dimensions: IntentGovernanceDimensions = {
    confidenceGovernance: scoreConfidenceGovernance(evaluation, observability),
    suppressionGovernance: scoreSuppressionGovernance(evaluation, observability),
    trustRiskGovernance: scoreTrustRiskGovernance(evaluation),
    merchantDiversityGovernance: scoreMerchantDiversityGovernance(evaluation, products),
    rankingIntegrityGovernance: scoreRankingIntegrityGovernance(evaluation, observability, rankingStable),
    comparisonFairnessGovernance: scoreComparisonFairnessGovernance(evaluation),
    anomalyGovernance: scoreAnomalyGovernance(evaluation, observability, blockedPolicies.length),
  };

  const monitoring = buildMonitoring({ observability, evaluation, rankingStable, products, policyResults });

  const suppressionSafety = dimensions.suppressionGovernance;
  const trustSafety = dimensions.trustRiskGovernance;
  const merchantBalanceScore = dimensions.merchantDiversityGovernance;
  const integrityScore = clamp(
    (dimensions.rankingIntegrityGovernance + evaluation.integrityScore + (observability.integrityPass ? 10 : -15)) / 2.1
  );

  const governanceScore = clamp(
    dimensions.confidenceGovernance * 0.14 +
      dimensions.suppressionGovernance * 0.16 +
      dimensions.trustRiskGovernance * 0.18 +
      dimensions.merchantDiversityGovernance * 0.14 +
      dimensions.rankingIntegrityGovernance * 0.18 +
      dimensions.comparisonFairnessGovernance * 0.1 +
      dimensions.anomalyGovernance * 0.1
  );

  const anomalyDetected =
    blockedPolicies.length > 0 ||
    monitoring.trustCorruptionCheck ||
    monitoring.suppressionAnomaly ||
    monitoring.rankingInstability;

  const rollbackGovernanceReason = deriveRollbackGovernanceReason({
    policyResults,
    productionApply,
    canary,
    evaluation,
    disabled: false,
  });

  return {
    version: INTENT_GOVERNANCE_VERSION,
    active: evaluation.active && optimization.advisoryOnly,
    advisoryOnly: true,
    autonomousBlocked: true,
    dimensions,
    monitoring,
    governanceScore,
    integrityScore,
    suppressionSafety,
    trustSafety,
    merchantBalanceScore,
    anomalyDetected,
    governanceWarnings,
    blockedPolicies,
    rollbackGovernanceReason,
    latencyMs: Date.now() - started,
  };
}

export function aggregateIntentGovernance(
  rows: { trayId: string; governance: IntentGovernanceMeta }[]
): {
  avgGovernanceScore: number;
  blockedPolicyCounts: Record<string, number>;
  anomalyTrays: string[];
} {
  const blockedPolicyCounts: Record<string, number> = {};
  const anomalyTrays: string[] = [];
  let sum = 0;

  for (const row of rows) {
    sum += row.governance.governanceScore;
    if (row.governance.anomalyDetected) anomalyTrays.push(row.trayId);
    for (const id of row.governance.blockedPolicies) {
      blockedPolicyCounts[id] = (blockedPolicyCounts[id] ?? 0) + 1;
    }
  }

  return {
    avgGovernanceScore: rows.length ? clamp(sum / rows.length) : 0,
    blockedPolicyCounts,
    anomalyTrays,
  };
}

export {
  isIntentGovernanceEnabled,
  isIntentGovernanceAdvisoryOnly,
  isIntentGovernanceAutonomousBlocked,
  INTENT_GOV_MIN_GOVERNANCE_SCORE,
  INTENT_GOV_MIN_SUPPRESSION_SAFETY,
  INTENT_GOV_MIN_TRUST_SAFETY,
};

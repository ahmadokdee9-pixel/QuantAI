/**
 * P4.8 — Intent intelligence policy registry (advisory enforcement catalog).
 */

import type { IntentApplyMeta } from "@/lib/intent/intentApply";
import type { IntentCanaryMeta } from "@/lib/intent/intentCanaryController";
import type { IntentEvaluationMeta } from "@/lib/intent/intentEvaluationEngine";
import type { IntentOptimizationMeta } from "@/lib/intent/intentOptimizationEngine";
import type { IntentObservabilityMeta } from "@/lib/intent/intentObservability";
import type { IntentProductionApplyMeta } from "@/lib/intent/intentProductionApply";
import { INTENT_APPLY_CONFIDENCE_MIN } from "@/lib/intent/intentIntelligenceFlags";
import { INTENT_OBS_MAX_DRIFT, INTENT_OBS_SUPPRESSION_RATE_MAX } from "@/lib/intent/intentObservabilityFlags";
import type { QuantProduct } from "@/lib/shoppingScore";
import { getMarketplaceSellerRiskTier } from "@/lib/retailTrust";

export type GovernancePolicyId =
  | "unsafe_suppression_block"
  | "over_optimization_prevention"
  | "trust_manipulation_prevention"
  | "merchant_domination_prevention"
  | "hidden_activation_detection"
  | "unstable_rerank_prevention";

export type GovernancePolicyCategory =
  | "suppression"
  | "optimization"
  | "trust"
  | "merchant"
  | "activation"
  | "ranking";

export type GovernancePolicyDefinition = {
  id: GovernancePolicyId;
  category: GovernancePolicyCategory;
  description: string;
  advisoryOnly: true;
};

export type PolicyEvaluationContext = {
  evaluation: IntentEvaluationMeta;
  optimization: IntentOptimizationMeta;
  observability: IntentObservabilityMeta;
  intentApply: IntentApplyMeta;
  productionApply: IntentProductionApplyMeta;
  canary: IntentCanaryMeta;
  products: QuantProduct[];
  rankingStable: boolean;
};

export type PolicyEvaluationResult = {
  policyId: GovernancePolicyId;
  blocked: boolean;
  warning: string | null;
};

export const INTENT_GOVERNANCE_POLICIES: GovernancePolicyDefinition[] = [
  {
    id: "unsafe_suppression_block",
    category: "suppression",
    description: "Block advisory path when suppression rate or precision is unsafe.",
    advisoryOnly: true,
  },
  {
    id: "over_optimization_prevention",
    category: "optimization",
    description: "Prevent over-optimization when recommendation load or risk is excessive.",
    advisoryOnly: true,
  },
  {
    id: "trust_manipulation_prevention",
    category: "trust",
    description: "Flag trust-risk manipulation patterns in top listings.",
    advisoryOnly: true,
  },
  {
    id: "merchant_domination_prevention",
    category: "merchant",
    description: "Flag single-merchant domination in governed top results.",
    advisoryOnly: true,
  },
  {
    id: "hidden_activation_detection",
    category: "activation",
    description: "Detect hidden apply activation when master switch or production gate is off.",
    advisoryOnly: true,
  },
  {
    id: "unstable_rerank_prevention",
    category: "ranking",
    description: "Prevent unstable rerank paths when drift or repeat-pass instability is detected.",
    advisoryOnly: true,
  },
];

function topMerchantCount(products: QuantProduct[], n = 5): number {
  const stores = new Set(products.slice(0, n).map((p) => p.store.toLowerCase().trim()));
  return stores.size;
}

function highRiskTopCount(products: QuantProduct[], n = 3): number {
  return products.slice(0, n).filter((p) => getMarketplaceSellerRiskTier(p.store, p.title) === "high").length;
}

export function evaluateGovernancePolicy(
  policyId: GovernancePolicyId,
  ctx: PolicyEvaluationContext
): PolicyEvaluationResult {
  const { evaluation, optimization, observability, intentApply, productionApply, canary, products, rankingStable } =
    ctx;

  switch (policyId) {
    case "unsafe_suppression_block": {
      const unsafe =
        observability.overSuppression ||
        observability.suppressionRate > INTENT_OBS_SUPPRESSION_RATE_MAX ||
        evaluation.analytics.suppressionPrecision < 55 ||
        evaluation.monitors.excessiveSuppressionWarning;
      return {
        policyId,
        blocked: unsafe,
        warning: unsafe
          ? `Suppression unsafe: rate=${observability.suppressionRate.toFixed(2)} precision=${evaluation.analytics.suppressionPrecision}`
          : null,
      };
    }
    case "over_optimization_prevention": {
      const excessive =
        optimization.riskLevel === "high" ||
        optimization.recommendations.length >= 6 ||
        (optimization.active && optimization.recommendations.filter((r) => r.direction !== "hold").length >= 4);
      return {
        policyId,
        blocked: excessive,
        warning: excessive
          ? `Over-optimization risk: recs=${optimization.recommendations.length} risk=${optimization.riskLevel}`
          : null,
      };
    }
    case "trust_manipulation_prevention": {
      const riskTop = highRiskTopCount(products);
      const corrupt =
        evaluation.monitors.trustMismatchWarning ||
        riskTop >= 2 ||
        evaluation.analytics.trustedMerchantRetention < 50;
      return {
        policyId,
        blocked: corrupt,
        warning: corrupt ? `Trust-risk pattern: highRiskTop=${riskTop} retention=${evaluation.analytics.trustedMerchantRetention}` : null,
      };
    }
    case "merchant_domination_prevention": {
      const diversity = topMerchantCount(products);
      const dominated = evaluation.monitors.merchantDiversityWarning || diversity < 2;
      return {
        policyId,
        blocked: dominated,
        warning: dominated ? `Merchant domination: uniqueStoresTop5=${diversity}` : null,
      };
    }
    case "hidden_activation_detection": {
      const hidden =
        observability.instabilityWarnings.includes("hidden_activation_path") ||
        (intentApply.applied && !intentApply.applyEnabled) ||
        (productionApply.blockedInProduction && intentApply.applied && productionApply.applyEnabled);
      return {
        policyId,
        blocked: hidden,
        warning: hidden ? "Hidden activation path detected in observability or apply meta" : null,
      };
    }
    case "unstable_rerank_prevention": {
      const unstable =
        !rankingStable ||
        observability.driftCount > INTENT_OBS_MAX_DRIFT ||
        evaluation.monitors.unstableRankingWarning ||
        canary.rollbackReason === "drift_ceiling_enforced" ||
        canary.rollbackReason === "instability_auto_disable";
      return {
        policyId,
        blocked: unstable,
        warning: unstable
          ? `Unstable rerank: stable=${rankingStable} drift=${observability.driftCount}`
          : null,
      };
    }
    default:
      return { policyId, blocked: false, warning: null };
  }
}

export function evaluateAllGovernancePolicies(ctx: PolicyEvaluationContext): PolicyEvaluationResult[] {
  return INTENT_GOVERNANCE_POLICIES.map((p) => evaluateGovernancePolicy(p.id, ctx));
}

export function getPolicyDefinition(policyId: GovernancePolicyId): GovernancePolicyDefinition | undefined {
  return INTENT_GOVERNANCE_POLICIES.find((p) => p.id === policyId);
}

/** Confidence boundary for governance advisory (mirrors apply floor, report-only). */
export function governanceConfidenceBoundary(): number {
  return INTENT_APPLY_CONFIDENCE_MIN;
}

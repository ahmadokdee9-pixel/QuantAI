/**
 * Phase 14 — Explainable forecasting layer.
 */

import type { PredictiveCommerceIntentResult } from "../types";
import type { PredictionGovernanceVerdict } from "../governance/predictionArbitration";

export function buildPredictionExplainability(args: {
  readinessLabel: string;
  purchaseHorizon: string;
  urgencyTier: string;
  timingHorizon: string;
  governance: PredictionGovernanceVerdict;
  fusedCount: number;
  traceExamples: string[];
}): PredictiveCommerceIntentResult["explain"] {
  return {
    whyReadiness: [`readiness_${args.readinessLabel}`],
    whyPurchase: [`horizon_${args.purchaseHorizon}`],
    whyTiming: [`temporal_${args.timingHorizon}`],
    whyUrgency: [`urgency_${args.urgencyTier}`],
    whyGovernance: args.governance.allowed ? ["governance_pass"] : args.governance.reasons,
    whyFusion: args.governance.allowed
      ? ["deterministic_prediction_fusion", `axes_${args.fusedCount}`]
      : ["fusion_shadow_only_veto"],
    traceExamples: args.traceExamples.slice(0, 6),
  };
}

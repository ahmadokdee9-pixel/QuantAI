/**
 * Phase 16 — Universal commerce explainability engine.
 */

import type { UniversalCommerceIntelligenceResult } from "../types";
import type { CognitionGovernanceVerdict } from "../governance/cognitionArbitration";
import type { UniversalVerticalId } from "../types";

export function buildUniversalExplainability(args: {
  dominantVertical: UniversalVerticalId;
  spread01: number;
  aestheticLabel: string;
  merchantVerdict: string;
  premiumBias: string;
  governance: CognitionGovernanceVerdict;
  fusedCount: number;
  traceExamples: string[];
}): UniversalCommerceIntelligenceResult["explain"] {
  return {
    whyVertical: [`dominant_${args.dominantVertical}`, `spread_${Math.round(args.spread01 * 100)}`],
    whyCrossCategory: [`verticals_active_${args.fusedCount}`],
    whyAesthetic: [`aesthetic_${args.aestheticLabel}`],
    whyTrust: [`merchant_${args.merchantVerdict}`, `premium_${args.premiumBias}`],
    whyGovernance: args.governance.allowed ? ["governance_pass"] : args.governance.reasons,
    whyFusion: args.governance.allowed
      ? ["deterministic_category_fusion"]
      : ["fusion_shadow_only_veto"],
    traceExamples: args.traceExamples.slice(0, 6),
  };
}

/**
 * Phase 17 — Emotional commerce explainability engine.
 */

import type { EmotionalCommerceIntelligenceResult } from "../types";
import type { EmotionalGovernanceVerdict } from "../governance/emotionalGovernanceVeto";

export function buildEmotionalExplainability(args: {
  driver: string;
  aestheticLabel: string;
  lifestyleLabel: string;
  premiumLabel: string;
  governance: EmotionalGovernanceVerdict;
  fusedCount: number;
  traceExamples: string[];
}): EmotionalCommerceIntelligenceResult["explain"] {
  return {
    whyEmotional: [`driver_${args.driver}`, `fused_axes_${args.fusedCount}`],
    whyAesthetic: [`aesthetic_${args.aestheticLabel}`],
    whyLifestyle: [`lifestyle_${args.lifestyleLabel}`],
    whyPremium: [`premium_${args.premiumLabel}`],
    whyGovernance: args.governance.allowed ? ["governance_pass"] : args.governance.reasons,
    whyFusion: args.governance.allowed
      ? ["deterministic_emotional_fusion"]
      : ["fusion_shadow_only_veto"],
    traceExamples: args.traceExamples.slice(0, 6),
  };
}

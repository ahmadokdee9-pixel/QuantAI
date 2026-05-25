/**
 * Phase 15 — Explainable strategy layer.
 */

import type { AutonomousCommerceStrategyResult } from "../types";
import type { StrategyGovernanceVerdict } from "../governance/strategyArbitration";

export function buildStrategyExplainability(args: {
  primaryStrategy: string;
  timingLabel: string;
  trustVerdict: string;
  regretMinimized: boolean;
  governance: StrategyGovernanceVerdict;
  fusedCount: number;
  traceExamples: string[];
}): AutonomousCommerceStrategyResult["explain"] {
  return {
    whyStrategy: [`primary_${args.primaryStrategy}`, `axes_${args.fusedCount}`],
    whyTiming: [`timing_${args.timingLabel}`],
    whyTrustRisk: [`merchant_${args.trustVerdict}`],
    whyRegret: [args.regretMinimized ? "regret_minimized" : "regret_elevated"],
    whyGovernance: args.governance.allowed ? ["governance_pass"] : args.governance.reasons,
    whyFusion: args.governance.allowed
      ? ["deterministic_strategy_fusion"]
      : ["fusion_shadow_only_veto"],
    traceExamples: args.traceExamples.slice(0, 6),
  };
}

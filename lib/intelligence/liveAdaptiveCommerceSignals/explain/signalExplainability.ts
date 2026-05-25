/**
 * Phase 12 — Explainable commerce signal traces.
 */

import type { LiveCommerceSignalsResult } from "../types";
import type { LiveSignalGovernanceVerdict } from "../governance/governanceSignalArbitration";

export function buildSignalExplainability(args: {
  movementLabel: string;
  momentum01: number;
  regionLabel: string;
  demandDirection: string;
  volatilityBand: string;
  governance: LiveSignalGovernanceVerdict;
  fusedCount: number;
}): LiveCommerceSignalsResult["explain"] {
  const whyGovernance = args.governance.allowed
    ? ["governance_pass"]
    : args.governance.reasons;

  return {
    whyMarketMovement: [`movement_${args.movementLabel}`, `fused_signals_${args.fusedCount}`],
    whyMomentum: [`momentum_${Math.round(args.momentum01 * 100)}`],
    whyRegional: [`region_${args.regionLabel}`],
    whyDemandShift: [`demand_${args.demandDirection}`],
    whyVolatility: [`volatility_${args.volatilityBand}`],
    whyGovernance,
    whyFusion: args.governance.allowed
      ? ["deterministic_fusion_kernel", "trust_weight_applied"]
      : ["fusion_shadow_only_veto"],
  };
}

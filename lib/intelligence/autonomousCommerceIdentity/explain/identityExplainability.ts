/**
 * Phase 13 — Explainable identity reasoning layer.
 */

import type { AutonomousCommerceIdentityResult } from "../types";
import type { IdentityGovernanceVerdict } from "../governance/identityArbitration";

export function buildIdentityExplainability(args: {
  personaId: string;
  luxuryBand: string;
  dominantCategory: string;
  maturityLabel: string;
  driftBand: string;
  governance: IdentityGovernanceVerdict;
  fusedCount: number;
  traceExamples: string[];
}): AutonomousCommerceIdentityResult["explain"] {
  return {
    whyPersona: [`persona_${args.personaId}`, `luxury_${args.luxuryBand}`],
    whyTaste: [`category_${args.dominantCategory}`],
    whyCategory: [`affinity_${args.dominantCategory}`],
    whyMaturity: [`maturity_${args.maturityLabel}`],
    whyDrift: [`drift_${args.driftBand}`],
    whyGovernance: args.governance.allowed ? ["governance_pass"] : args.governance.reasons,
    whyFusion: args.governance.allowed
      ? ["deterministic_identity_fusion", `axes_${args.fusedCount}`]
      : ["fusion_shadow_only_veto"],
    traceExamples: args.traceExamples.slice(0, 6),
  };
}

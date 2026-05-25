/**
 * Phase 18 — Evolution explainability engine.
 */

import type { AutonomousCommerceEvolutionResult } from "../types";
import type { EvolutionGovernanceVerdict } from "../governance/evolutionGovernanceVeto";

export function buildEvolutionExplainability(args: {
  heuristicLabel: string;
  ontologyCount: number;
  calibrationBand: string;
  governance: EvolutionGovernanceVerdict;
  fusedCount: number;
  traceExamples: string[];
}): AutonomousCommerceEvolutionResult["explain"] {
  return {
    whyEvolution: [`calibration_${args.calibrationBand}`, `fused_axes_${args.fusedCount}`],
    whyOntology: [`ontology_nodes_${args.ontologyCount}`],
    whyHeuristic: [`heuristic_${args.heuristicLabel}`],
    whyGovernance: args.governance.allowed ? ["governance_pass"] : args.governance.reasons,
    whyFusion: args.governance.allowed
      ? ["deterministic_evolution_fusion"]
      : ["fusion_shadow_only_veto"],
    traceExamples: args.traceExamples.slice(0, 6),
  };
}

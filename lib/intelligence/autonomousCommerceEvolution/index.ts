/**
 * Phase 18 — Autonomous commerce evolution (public API).
 */

export type {
  AutonomousCommerceEvolutionInput,
  AutonomousCommerceEvolutionResult,
  AutonomousCommerceEvolutionMeta,
  EvolutionAxisId,
  FusedEvolutionSignal,
  ShadowEvolutionCandidate,
} from "./types";

export { AUTONOMOUS_COMMERCE_EVOLUTION_VERSION } from "./types";
export { readAutonomousCommerceEvolutionFlags } from "./flags";

export {
  buildAutonomousCommerceEvolution,
  autonomousCommerceEvolutionMetaForSearch,
  snapshotAutonomousEvolutionOrchestration,
} from "./buildAutonomousCommerceEvolution";

export { runAutonomousEvolutionKernel } from "./kernel/autonomousEvolutionKernel";
export { refineOntology } from "./ontology/ontologyRefinementEngine";
export { evolveCommerceHeuristics } from "./heuristic/commerceHeuristicEvolution";

export {
  buildEvolutionReplayFingerprint,
  assertEvolutionReplayDeterministic,
} from "./replay/deterministicEvolutionExecution";

export {
  validateEvolutionReplayContract,
  DEFAULT_EVOLUTION_REPLAY_CONTRACT,
} from "./replay/evolutionReplayContracts";

export { arbitrateEvolutionCognition } from "./governance/evolutionGovernanceVeto";

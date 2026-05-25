export { COMMERCE_EVOLUTION_VERSION } from "./types";
export type {
  CommerceEvolutionResult,
  CommerceEvolutionInput,
  CommerceEvolutionMeta,
  EvolutionExplainability,
  ShadowEvolutionCandidate,
  CommerceLifecycleProfile,
  IntentTransitionSnapshot,
} from "./types";

export { readCommerceEvolutionFlags } from "./flags";
export type { CommerceEvolutionFlags } from "./flags";

export {
  buildCommerceEvolution,
  commerceEvolutionMetaForSearch,
  snapshotEvolutionOrchestration,
} from "./buildCommerceEvolution";
export type { BuildCommerceEvolutionOptions } from "./buildCommerceEvolution";
export type { EvolutionOrchestrationSnapshot } from "./evolutionOrchestration";

export { runBoundedEvolutionEngine } from "./engine/boundedEvolutionEngine";
export { buildEvolutionMemoryGraph } from "./memory/evolutionMemoryGraph";
export { resolveCommerceLifecycle } from "./lifecycle/commerceLifecycleIntelligence";
export { trackIntentTransition } from "./intent/intentTransitionTracker";
export { detectSeasonalCommerceEvolution } from "./market/seasonalCommerceEvolution";
export { reasonTemporalRecommendation } from "./temporal/temporalRecommendationReasoning";
export { evaluateEvolutionAdaptationBoundaries } from "./governance/evolutionAdaptationBoundaries";
export { buildShadowEvolutionCandidates } from "./candidates/shadowEvolutionCandidates";

export {
  DEFAULT_EVOLUTION_REPLAY_CONTRACT,
  validateEvolutionReplayContract,
} from "./replay/evolutionReplayContracts";
export {
  buildEvolutionReplayFingerprint,
  assertEvolutionReplayDeterministic,
} from "./replay/deterministicEvolutionExecution";

export { MEMORY_ENGINE_VERSION } from "./types";
export type {
  CommerceMemoryMeta,
  CommerceMemoryResult,
  CommerceMemoryInput,
  CanonicalUserTaste,
  MemoryExplainability,
  DeterministicPreferenceSignals,
  RecommendationPrepNode,
  AestheticAxisScores,
  TasteSensitivityProfile,
} from "./types";

export { readCommerceMemoryFlags } from "./flags";
export type { CommerceMemoryFlags } from "./flags";

export {
  buildCommerceMemoryFoundation,
  commerceMemoryMetaForSearch,
  snapshotMemoryOrchestration,
} from "./buildCommerceMemoryFoundation";
export type { BuildCommerceMemoryFoundationOptions } from "./buildCommerceMemoryFoundation";
export type { MemoryOrchestrationContext, MemoryOrchestrationSnapshot } from "./memoryOrchestration";

export { runTasteProfileEngine } from "./taste/tasteProfileEngine";
export { resolveStyleSignals } from "./taste/styleSignalResolver";
export { trackBrandAffinity, topBrands } from "./taste/brandAffinityTracker";
export { buildAestheticPreferenceGraph } from "./taste/aestheticPreferenceGraph";

export { runCommerceMemoryKernel } from "./memory/commerceMemoryKernel";
export { buildInteractionMemoryGraph } from "./memory/interactionMemoryGraph";
export { updateShoppingIntentMemory } from "./memory/shoppingIntentMemory";

export { buildDeterministicPreferenceSignals } from "./signals/deterministicPreferenceSignals";
export { applyConfidenceDecay } from "./signals/confidenceDecayEngine";
export { trackMemoryStability } from "./signals/memoryStabilityTracker";

export { buildMemoryExplainability } from "./explain/memoryExplainability";
export { buildRecommendationPrepGraph } from "./recommendation/recommendationPrepGraph";

export {
  DEFAULT_PREFERENCE_REPLAY_CONTRACT,
  validatePreferenceReplayContract,
  MAX_INTERACTION_NODES,
  MAX_INTENT_RECORDS,
  MAX_MEMORY_GROWTH_BYTES,
} from "./replay/preferenceReplayContracts";
export {
  buildMemoryReplayFingerprint,
  assertMemoryReplayDeterministic,
  isMemoryExecutionBounded,
  verifyBoundedMemoryGrowth,
} from "./replay/deterministicMemoryExecution";

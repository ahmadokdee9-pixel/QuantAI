export { RECOMMENDATION_COGNITION_VERSION } from "./types";
export type {
  RecommendationCognitionMeta,
  RecommendationCognitionResult,
  RecommendationCognitionInput,
  LatentIntentProfile,
  IntentEvolutionSnapshot,
  RecommendationExplainability,
  ShadowRecommendationCandidate,
} from "./types";

export { readRecommendationCognitionFlags } from "./flags";
export type { RecommendationCognitionFlags } from "./flags";

export {
  buildRecommendationCognition,
  recommendationCognitionMetaForSearch,
  snapshotRecommendationCognitionOrchestration,
} from "./buildRecommendationCognition";
export type { BuildRecommendationCognitionOptions } from "./buildRecommendationCognition";
export type {
  RecommendationCognitionOrchestrationContext,
  RecommendationCognitionOrchestrationSnapshot,
} from "./recommendationCognitionOrchestration";

export { runRecommendationCognitionEngine } from "./cognition/recommendationCognitionEngine";
export { resolveLatentIntent } from "./cognition/latentIntentResolver";
export { buildPurchaseMotivationGraph } from "./cognition/purchaseMotivationGraph";
export { runRecommendationReasoningKernel } from "./cognition/recommendationReasoningKernel";

export { buildAutonomousRecommendationGraph } from "./graph/autonomousRecommendationGraph";
export { buildRelatedCommerceGraph } from "./graph/relatedCommerceGraph";
export { buildRecommendationTrajectory } from "./graph/recommendationTrajectoryEngine";
export { reasonCategoryExpansion } from "./graph/categoryExpansionReasoner";

export { trackIntentEvolution } from "./intent/intentEvolutionTracker";
export { buildShadowRecommendationCandidates, computeDiversityStability } from "./candidates/shadowRecommendationCandidates";
export { applyRecommendationSafetyGuards } from "./safety/recommendationSafetyGuards";
export { buildRecommendationExplainability } from "./explain/recommendationExplainability";

export {
  DEFAULT_RECOMMENDATION_CONTRACT,
  validateRecommendationContract,
  MAX_SHADOW_CANDIDATES,
} from "./contracts/deterministicRecommendationContracts";
export {
  buildRecommendationReplayFingerprint,
  assertRecommendationReplayDeterministic,
  isRecommendationExecutionBounded,
} from "./replay/recommendationReplayKernel";
export { computeBoundedRecommendationState } from "./replay/boundedRecommendationState";

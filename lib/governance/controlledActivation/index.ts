export { CONTROLLED_ACTIVATION_VERSION } from "./types";
export type {
  ControlledActivationResult,
  ControlledActivationInput,
  ControlledActivationMeta,
  ActivationDecision,
  MutationGovernanceVerdict,
  ShadowRecommendationMutation,
} from "./types";

export { readControlledActivationFlags } from "./flags";
export type { ControlledActivationFlags } from "./flags";

export { buildControlledActivation, controlledActivationMetaForSearch } from "./buildControlledActivation";

export { runCanaryActivationKernel } from "./canary/canaryActivationKernel";
export { allocateTrafficBucket, isInCanaryBucket } from "./canary/activationTrafficAllocator";
export { evaluateDeterministicMutationGate } from "./canary/deterministicMutationGate";
export { routeBoundedMutation } from "./canary/boundedMutationRouter";

export { runMutationGovernanceKernel } from "./mutation/mutationGovernanceKernel";
export { evaluateRankingSafety } from "./mutation/rankingSafetyEvaluator";
export { validateReplayMutation } from "./mutation/replayMutationValidator";
export { auditCommerceMutation } from "./mutation/commerceMutationAuditor";

export { runEmergencyRollbackKernel } from "./rollback/emergencyRollbackKernel";
export { restoreProductOrder, buildRestoreId } from "./rollback/deterministicStateRestore";
export {
  getCognitionFreezeState,
  setCognitionFreeze,
  clearCognitionFreeze,
  resetCognitionFreezeForTests,
} from "./rollback/cognitionFreezeController";

export { computeBoundedInfluence } from "./influence/boundedRecommendationInfluence";
export { evaluateAntiManipulation } from "./influence/antiManipulationGovernor";
export { computeMerchantDiversityScore } from "./influence/diversityProtectionKernel";

export {
  DEFAULT_SHADOW_RECOMMENDATION_APPLY_CONTRACT,
  validateRecommendationApplyContract,
} from "./apply/deterministicRecommendationApplyContracts";
export { prepareShadowRecommendationMutation } from "./apply/shadowRecommendationMutation";

export {
  DEFAULT_ACTIVATION_REPLAY_CONTRACT,
  validateActivationReplayContract,
} from "./replay/activationReplayContracts";
export {
  buildActivationReplayFingerprint,
  assertActivationReplayDeterministic,
} from "./replay/deterministicActivationExecution";

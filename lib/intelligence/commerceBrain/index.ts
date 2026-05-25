export { COMMERCE_BRAIN_VERSION } from "./types";
export type {
  CommerceBrainResult,
  CommerceBrainInput,
  CommerceBrainMeta,
  FusedIntelligenceSignal,
  BrainArbitrationVerdict,
  SynthesizedRecommendation,
  BrainExplainability,
  IntelligenceLayerId,
} from "./types";

export { readCommerceBrainFlags } from "./flags";
export type { CommerceBrainFlags } from "./flags";

export {
  buildUnifiedCommerceBrain,
  commerceBrainMetaForSearch,
  snapshotBrainOrchestration,
} from "./buildUnifiedCommerceBrain";
export type { BrainOrchestrationSnapshot } from "./orchestrator/boundedCommerceBrainOrchestration";

export { runUnifiedReasoningKernel } from "./kernel/unifiedReasoningKernel";
export { fuseCrossIntelligenceSignals } from "./fusion/crossIntelligenceSignalFusion";
export { fuseTemporalTrustTaste } from "./fusion/temporalTrustTasteFusion";
export { arbitrateIntelligence } from "./arbitration/deterministicIntelligenceArbitration";
export { buildUnifiedCommerceDecisionGraph } from "./graph/unifiedCommerceDecisionGraph";
export { synthesizeDeterministicRecommendation } from "./synthesis/deterministicRecommendationSynthesis";
export { evaluateBrainOrchestrationBoundaries } from "./governance/brainOrchestrationBoundaries";

export {
  DEFAULT_BRAIN_REPLAY_CONTRACT,
  validateBrainReplayContract,
} from "./replay/brainReplayContracts";
export {
  buildBrainReplayFingerprint,
  assertBrainReplayDeterministic,
} from "./replay/deterministicBrainExecution";

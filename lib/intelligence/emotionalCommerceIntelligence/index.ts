/**
 * Phase 17 — Emotional commerce intelligence (public API).
 */

export type {
  EmotionalCommerceIntelligenceInput,
  EmotionalCommerceIntelligenceResult,
  EmotionalCommerceIntelligenceMeta,
  EmotionalAxisId,
  FusedEmotionalSignal,
  ShadowEmotionalCandidate,
} from "./types";

export { EMOTIONAL_COMMERCE_INTELLIGENCE_VERSION } from "./types";
export { readEmotionalCommerceIntelligenceFlags } from "./flags";

export {
  buildEmotionalCommerceIntelligence,
  emotionalCommerceIntelligenceMetaForSearch,
  snapshotEmotionalOrchestration,
} from "./buildEmotionalCommerceIntelligence";

export { runEmotionalCommerceKernel } from "./kernel/emotionalCommerceKernel";
export { buildEmotionalCommerceOntology } from "./ontology/emotionalCommerceOntology";

export {
  buildEmotionalReplayFingerprint,
  assertEmotionalReplayDeterministic,
} from "./replay/deterministicEmotionalExecution";

export {
  validateEmotionalReplayContract,
  DEFAULT_EMOTIONAL_REPLAY_CONTRACT,
} from "./replay/emotionalReplayContracts";

export { arbitrateEmotionalCognition } from "./governance/emotionalGovernanceVeto";

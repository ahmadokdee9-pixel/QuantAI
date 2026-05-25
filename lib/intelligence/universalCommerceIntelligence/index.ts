/**
 * Phase 16 — Universal commerce intelligence (public API).
 */

export type {
  UniversalCommerceIntelligenceInput,
  UniversalCommerceIntelligenceResult,
  UniversalCommerceIntelligenceMeta,
  UniversalVerticalId,
  UniversalAxisId,
  FusedUniversalSignal,
  ShadowUniversalCandidate,
} from "./types";

export { UNIVERSAL_COMMERCE_INTELLIGENCE_VERSION } from "./types";
export { readUniversalCommerceIntelligenceFlags } from "./flags";

export {
  buildUniversalCommerceIntelligence,
  universalCommerceIntelligenceMetaForSearch,
  snapshotUniversalOrchestration,
} from "./buildUniversalCommerceIntelligence";

export { runUniversalCommerceKernel } from "./kernel/universalCommerceKernel";
export { buildUniversalCommerceOntology } from "./ontology/universalCommerceOntology";
export { resolveUniversalCategoryCognition } from "./cognition/universalCategoryCognition";

export {
  buildUniversalReplayFingerprint,
  assertUniversalReplayDeterministic,
} from "./replay/deterministicUniversalExecution";

export {
  validateUniversalReplayContract,
  DEFAULT_UNIVERSAL_REPLAY_CONTRACT,
} from "./replay/universalReplayContracts";

export { arbitrateUniversalCognition } from "./governance/cognitionArbitration";

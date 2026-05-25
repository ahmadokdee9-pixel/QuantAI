/**
 * Phase 13 — Autonomous commerce identity (public API).
 */

export type {
  AutonomousCommerceIdentityInput,
  AutonomousCommerceIdentityResult,
  AutonomousCommerceIdentityMeta,
  FusedIdentitySignal,
  IdentityAxisId,
  ShadowIdentityCandidate,
  CommercePersonaNode,
  IdentityGraphNode,
} from "./types";

export { AUTONOMOUS_COMMERCE_IDENTITY_VERSION } from "./types";
export { readAutonomousCommerceIdentityFlags } from "./flags";

export {
  buildAutonomousCommerceIdentity,
  autonomousCommerceIdentityMetaForSearch,
  snapshotCommerceIdentityOrchestration,
} from "./buildAutonomousCommerceIdentity";

export type { CommerceIdentityOrchestrationSnapshot } from "./orchestrator/commerceIdentityOrchestration";

export { runIdentityOrchestrationKernel } from "./kernel/identityOrchestrationKernel";

export {
  fuseDeterministicIdentitySignals,
  computeFusedIdentityScore,
} from "./fusion/deterministicIdentityFusionEngine";

export {
  buildIdentityReplayFingerprint,
  assertIdentityReplayDeterministic,
} from "./replay/deterministicIdentityExecution";

export {
  validateIdentityReplayContract,
  DEFAULT_IDENTITY_REPLAY_CONTRACT,
} from "./replay/identityReplayContracts";

export { arbitrateIdentityGovernance } from "./governance/identityArbitration";

export { buildIdentityContinuityMemory } from "./memory/identityContinuityMemory";

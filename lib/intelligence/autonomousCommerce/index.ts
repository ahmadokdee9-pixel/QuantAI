export { AUTONOMOUS_COMMERCE_OS_VERSION } from "./types";
export type {
  AutonomousCommerceOsMeta,
  AutonomousCommerceOsResult,
  AutonomousCommerceOsInput,
  MarketConditionProfile,
  EconomicContextProfile,
  CommerceOsExplainability,
  StrategicRecommendationLayer,
} from "./types";

export { readAutonomousCommerceOsFlags } from "./flags";
export type { AutonomousCommerceOsFlags } from "./flags";

export {
  buildAutonomousCommerceOs,
  autonomousCommerceOsMetaForSearch,
  snapshotAutonomousCommerceOrchestration,
} from "./buildAutonomousCommerceOs";
export type { BuildAutonomousCommerceOsOptions } from "./buildAutonomousCommerceOs";
export type {
  AutonomousCommerceOrchestrationContext,
  AutonomousCommerceOrchestrationSnapshot,
} from "./autonomousCommerceOrchestration";

export { runMarketAwarenessEngine } from "./market/marketAwarenessEngine";
export { resolveMarketConditions } from "./market/marketConditionResolver";
export { runAutonomousCommerceKernel } from "./orchestrator/autonomousCommerceKernel";
export { interpretEconomicSignals } from "./economic/economicSignalInterpreter";
export { buildCanonicalCommerceIntelligenceGraph } from "./graph/canonicalCommerceIntelligenceGraph";
export { applyCommerceSafetyGovernance } from "./governance/commerceSafetyGovernance";

export {
  DEFAULT_ORCHESTRATION_REPLAY_CONTRACT,
  validateOrchestrationReplayContract,
} from "./replay/orchestrationReplayContracts";
export {
  buildOrchestrationReplayFingerprint,
  assertOrchestrationReplayDeterministic,
  verifyBoundedCognition,
} from "./replay/deterministicOrchestrationExecution";

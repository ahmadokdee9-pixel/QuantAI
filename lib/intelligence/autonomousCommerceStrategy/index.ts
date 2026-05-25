/**
 * Phase 15 — Autonomous commerce strategy (public API).
 */

export type {
  AutonomousCommerceStrategyInput,
  AutonomousCommerceStrategyResult,
  AutonomousCommerceStrategyMeta,
  FusedStrategySignal,
  StrategyAxisId,
  ShadowStrategyCandidate,
} from "./types";

export { AUTONOMOUS_COMMERCE_STRATEGY_VERSION } from "./types";
export { readAutonomousCommerceStrategyFlags } from "./flags";

export {
  buildAutonomousCommerceStrategy,
  autonomousCommerceStrategyMetaForSearch,
  snapshotStrategyOrchestration,
} from "./buildAutonomousCommerceStrategy";

export { runAutonomousStrategyKernel } from "./kernel/autonomousStrategyKernel";

export {
  fuseDeterministicStrategySignals,
  computeFusedStrategyScore,
} from "./fusion/deterministicStrategyFusionEngine";

export {
  buildStrategyReplayFingerprint,
  assertStrategyReplayDeterministic,
} from "./replay/deterministicStrategyExecution";

export {
  validateStrategyReplayContract,
  DEFAULT_STRATEGY_REPLAY_CONTRACT,
} from "./replay/strategyReplayContracts";

export { arbitrateStrategyGovernance } from "./governance/strategyArbitration";

/**
 * Phase 12 — Live adaptive commerce signals (public API).
 */

export type {
  LiveCommerceSignalsInput,
  LiveCommerceSignalsResult,
  LiveCommerceSignalsMeta,
  FusedLiveSignal,
  LiveSignalId,
  ShadowLiveSignalCandidate,
  CommerceTimingNode,
} from "./types";

export { LIVE_COMMERCE_SIGNALS_VERSION } from "./types";
export { readLiveCommerceSignalsFlags } from "./flags";

export {
  buildLiveAdaptiveCommerceSignals,
  liveCommerceSignalsMetaForSearch,
  snapshotLiveSignalOrchestration,
} from "./buildLiveCommerceSignals";

export type { LiveSignalOrchestrationSnapshot } from "./orchestrator/liveSignalOrchestration";

export {
  fuseDeterministicLiveSignals,
  computeFusedLiveScore,
} from "./kernel/deterministicSignalFusionKernel";

export { runBoundedLiveSignalEngine } from "./engine/boundedLiveSignalEngine";

export {
  buildLiveSignalReplayFingerprint,
  assertLiveSignalReplayDeterministic,
} from "./replay/deterministicLiveSignalExecution";

export {
  validateLiveSignalReplayContract,
  DEFAULT_LIVE_SIGNAL_REPLAY_CONTRACT,
} from "./replay/liveSignalReplayContracts";

export { arbitrateLiveSignalGovernance } from "./governance/governanceSignalArbitration";

/**
 * Phase 14 — Predictive commerce intent (public API).
 */

export type {
  PredictiveCommerceIntentInput,
  PredictiveCommerceIntentResult,
  PredictiveCommerceIntentMeta,
  FusedPredictionSignal,
  PredictionAxisId,
  ShadowPredictiveCandidate,
} from "./types";

export { PREDICTIVE_COMMERCE_INTENT_VERSION } from "./types";
export { readPredictiveCommerceIntentFlags } from "./flags";

export {
  buildPredictiveCommerceIntent,
  predictiveCommerceIntentMetaForSearch,
  snapshotPredictiveIntentOrchestration,
} from "./buildPredictiveCommerceIntent";

export { runPredictiveIntentKernel } from "./kernel/predictiveIntentKernel";

export {
  fuseDeterministicPredictions,
  computeFusedPredictionScore,
} from "./fusion/deterministicPredictionFusionEngine";

export {
  buildPredictionReplayFingerprint,
  assertPredictionReplayDeterministic,
} from "./replay/deterministicPredictionExecution";

export {
  validatePredictionReplayContract,
  DEFAULT_PREDICTION_REPLAY_CONTRACT,
} from "./replay/predictionReplayContracts";

export { arbitratePredictionGovernance } from "./governance/predictionArbitration";

export { TRUST_ENGINE_VERSION } from "./types";
export type {
  TrustEngineMeta,
  TrustEngineResult,
  TrustEngineInput,
  MerchantTrustProfile,
  PriceTruthProfile,
  TrustExplainability,
  TrustRankingPrepSignals,
  CanonicalOfferIntelligence,
} from "./types";

export { readTrustEngineFlags } from "./flags";
export type { TrustEngineFlags } from "./flags";

export {
  buildTrustTruthEngine,
  trustEngineMetaForSearch,
  snapshotTrustOrchestration,
} from "./buildTrustTruthEngine";
export type { BuildTrustTruthEngineOptions } from "./buildTrustTruthEngine";
export type { TrustOrchestrationContext, TrustOrchestrationSnapshot } from "./trustOrchestration";

export { runMerchantTrustKernel } from "./merchant/merchantTrustKernel";
export { buildMerchantReputationGraph } from "./merchant/merchantReputationGraph";
export { trackMerchantConsistency } from "./merchant/merchantConsistencyTracker";
export { detectSuspiciousSellers } from "./merchant/suspiciousSellerDetector";

export { runPriceTruthEngine } from "./pricing/priceTruthEngine";
export { resolveHistoricalBaseline, resolveTrayBaselines } from "./pricing/historicalPriceResolver";
export { detectPriceAnomalies } from "./pricing/priceAnomalyDetector";
export { evaluateMsrpIntegrity } from "./pricing/msrpIntegrityEngine";

export { buildCanonicalOfferIntelligence, buildAllOfferIntelligence } from "./offer/canonicalOfferIntelligence";
export { buildTrustRankingPrepSignals } from "./ranking/trustRankingSignals";
export { buildTrustExplainability } from "./explain/trustExplainability";

export {
  DEFAULT_TRUST_REPLAY_CONTRACT,
  validateTrustReplayContract,
} from "./replay/trustReplayContracts";
export {
  buildTrustReplayFingerprint,
  assertTrustReplayDeterministic,
  isTrustExecutionBounded,
} from "./replay/deterministicTrustExecution";

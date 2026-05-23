export { readNormalizationFlags, isStage1ShadowRollout } from "./flags";
export type { NormalizationFlags } from "./flags";
export { emitNormalizationShadowTelemetry } from "./shadowTelemetry";
export type { NormalizationShadowLogPayload } from "./shadowTelemetry";
export {
  buildStage1ShadowMetrics,
  computeRolloutReadinessScore,
  rolloutReadinessGrade,
  enrichShadowTelemetry,
  canonicalIdentityCoverage,
  merchantDiversityScore,
  semanticCoherenceScore,
} from "./shadowMetrics";
export type { Stage1ShadowMetrics, RolloutReadinessInput } from "./shadowMetrics";
export {
  buildCommerceId,
  buildEquivalenceClassId,
  buildFamilyGraphId,
  buildListingKey,
  buildNormalizedListingRecord,
  buildRankingIdentityKey,
  extractIdentifierAnchors,
  fnv1aHex,
} from "./canonicalId";
export { normalizeCommerceProductTray } from "./normalizeProductTray";
export {
  integrateNormalizationInSearchTray,
  buildShadowTelemetry,
  normalizationMetaForSearchResponse,
} from "./searchIntegration";
export type { SearchNormalizationIntegrationResult } from "./searchIntegration";
export { runDedupPipeline, computeTop3DuplicateRate } from "./dedupPipeline";
export { buildEquivalenceGraph } from "./equivalenceGraph";
export {
  extractVariantAxes,
  extractModelTierKey,
  variantBoundaryConflict,
  equivalenceGroupHasVariantBoundaryViolation,
  parseVariantFingerprintSegments,
} from "./variantBoundary";
export type { VariantAxes, VariantBoundaryVerdict } from "./variantBoundary";
export { areSameMerchantNearDuplicates, reconcileMerchantDuplicates } from "./merchantReconciliation";
export type {
  NormalizationCollapseReason,
  NormalizationEquivalenceGroup,
  NormalizationMode,
  NormalizationOptions,
  NormalizationShadowTelemetry,
  NormalizationStage,
  NormalizationTrayMeta,
  NormalizationTrayResult,
  NormalizedListingRecord,
  QiNormalizedCommerceIdentity,
} from "./types";
export { NORMALIZATION_VERSION } from "./types";

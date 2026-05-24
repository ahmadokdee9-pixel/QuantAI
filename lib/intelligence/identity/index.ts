export { IDENTITY_FOUNDATION_VERSION } from "./types";
export type {
  IdentityFoundationMeta,
  IdentityFoundationResult,
  CanonicalProductNode,
  MerchantOfferLink,
  ResolvedProductIdentity,
  TrustSignalBundle,
  VariantBoundaryTrace,
  IdentityMergeReason,
} from "./types";

export { readIdentityFoundationFlags } from "./flags";
export type { IdentityFoundationFlags } from "./flags";

export {
  buildIdentityFoundation,
  identityFoundationMetaForSearch,
} from "./buildIdentityFoundation";
export type { BuildIdentityFoundationInput } from "./buildIdentityFoundation";

export { buildCanonicalProductGraph, graphCoverage } from "./canonicalProductGraph";
export type { CanonicalProductGraph, CanonicalProductEdge } from "./canonicalProductGraph";

export {
  resolveProductIdentity,
  resolveTrayIdentities,
  canMergeIdentities,
} from "./productIdentityResolver";

export {
  checkVariantBoundary,
  buildVariantBoundaryTraces,
  countFalseCollapseBlocks,
} from "./variantBoundaryEngine";

export { buildMerchantOfferGraph, linkMerchantOffer } from "./merchantOfferLinker";

export {
  normalizeProductTitle,
  extractGenerationKey,
  extractEditionKey,
  isAccessoryListing,
  isBundleContamination,
} from "./titleNormalization";

export { PriceHistoryStore, trayPriceHistoryStore } from "./pricing/priceHistoryStore";
export {
  ingestTrayPrices,
  buildMerchantPriceTimeline,
  buildTimelinesForTray,
} from "./pricing/merchantPriceTimeline";
export { detectIdentityFakeDiscount } from "./pricing/fakeDiscountDetector";
export type { IdentityFakeDiscountVerdict } from "./pricing/fakeDiscountDetector";

export { computeTrustSignals } from "./trust/trustSignals";

export {
  CANONICAL_RETRIEVAL_CONTRACT,
  validateRetrievalContract,
  RETRIEVAL_CONTRACT_VERSION,
} from "./retrieval/retrievalContracts";
export type {
  RetrievalLayerContract,
  CanonicalRetrievalHit,
  CanonicalRetrievalQuery,
} from "./retrieval/retrievalContracts";

export {
  buildCanonicalRetrievalSurface,
} from "./retrieval/canonicalRetrievalSurface";
export type { CanonicalRetrievalSurface } from "./retrieval/canonicalRetrievalSurface";

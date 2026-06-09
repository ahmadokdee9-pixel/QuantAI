/**
 * Phase 1C — SKU identity layer (barrel exports).
 */

export {
  SUPPORTED_CROSS_MERCHANTS,
  extractMerchantListingId,
  groupResolvedIdentitiesBySku,
  isSupportedCrossMerchant,
  listingsShareCanonicalSku,
  normalizeMerchantKey,
  type SupportedCrossMerchant,
} from "@/lib/truth/crossMerchantLinking";

export { buildProductFingerprint, fingerprintStableKey } from "@/lib/truth/productFingerprint";

export {
  extractStructuredIdentifiers,
  resolveSkuIdentitiesForListings,
  resolveSkuIdentity,
  type StructuredIdentifier,
} from "@/lib/truth/skuResolver";

export {
  getCanonicalSkuIdForListing,
  getSkuIdentityRegistry,
  getSkuMappingsByListingUrls,
  isSkuIdentityStorageConfigured,
  resolveAndPersistSkuIdentity,
  upsertSkuIdentityMapping,
  upsertSkuIdentityRegistry,
} from "@/lib/truth/skuIdentityRegistry";

export {
  SKU_RESOLVER_METHODS,
  type ProductFingerprint,
  type ResolvedSkuIdentity,
  type SkuGlobalProductIdentity,
  type SkuIdentityMappingRow,
  type SkuIdentityPersistResult,
  type SkuIdentityRegistryRow,
  type SkuResolverMethod,
} from "@/lib/truth/skuIdentityTypes";

/**
 * Phase 1C — SKU identity types.
 * Truth foundation: one product, many listings.
 */

import type { GlobalProductIdentity } from "@/lib/intelligence/globalProductIdentityEngine";

export const SKU_RESOLVER_METHODS = [
  "gtin",
  "upc",
  "ean",
  "mpn",
  "brand_model",
  "fingerprint",
] as const;

export type SkuResolverMethod = (typeof SKU_RESOLVER_METHODS)[number];

export type ProductFingerprint = {
  brand: string;
  title: string;
  normalizedTitle: string;
  specs: Record<string, string>;
  capacity: string | null;
  color: string | null;
  size: string | null;
  modelTokens: string[];
  fingerprintKey: string;
};

export type SkuGlobalProductIdentity = Pick<
  GlobalProductIdentity,
  | "version"
  | "canonicalKey"
  | "brandKey"
  | "modelKey"
  | "normalizedTitle"
  | "model"
  | "size"
  | "color"
  | "storage"
  | "condition"
  | "identityConfidence"
>;

export type ResolvedSkuIdentity = {
  canonicalSkuId: string;
  canonicalKey: string;
  resolverMethod: SkuResolverMethod;
  identityConfidence: number;
  globalProductIdentity: SkuGlobalProductIdentity;
  fingerprint: ProductFingerprint;
  merchantKey: string;
  merchantListingId: string | null;
};

export type SkuIdentityRegistryRow = {
  canonical_sku_id: string;
  canonical_key: string;
  brand_key: string | null;
  model_key: string | null;
  resolver_method: SkuResolverMethod;
  identity_confidence: number;
  global_product_identity: SkuGlobalProductIdentity;
  fingerprint: ProductFingerprint;
  created_at: string;
  updated_at: string;
};

export type SkuIdentityMappingRow = {
  id: string;
  canonical_sku_id: string;
  listing_url: string;
  merchant_key: string;
  merchant_listing_id: string | null;
  match_confidence: number;
  resolver_method: SkuResolverMethod;
  created_at: string;
  updated_at: string;
};

export type SkuIdentityPersistResult = {
  canonicalSkuId: string;
  registryUpserted: boolean;
  mappingUpserted: boolean;
};

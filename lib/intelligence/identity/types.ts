/**
 * Phase 4 — Canonical commerce identity foundation types (deterministic, no embeddings).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { VariantAxes } from "@/lib/intelligence/normalization/variantBoundary";

export const IDENTITY_FOUNDATION_VERSION = "phase4.0";

export type IdentityMergeReason =
  | "identifier_anchor"
  | "variant_key_match"
  | "cross_retail_match"
  | "same_merchant_near_dup"
  | "family_graph"
  | "none"
  | "blocked_variant_boundary";

export type ResolvedProductIdentity = {
  commerceId: string;
  familyGraphId: string;
  variantKey: string;
  listingKey: string;
  rankingIdentityKey: string;
  identifierAnchors: string[];
  normalizedTitle: string;
  axes: VariantAxes;
  identityConfidence: number;
  mergeReason: IdentityMergeReason;
  boundaryBlocked: boolean;
  boundaryReasons: string[];
};

export type MerchantOfferLink = {
  listingKey: string;
  link: string;
  store: string;
  price: number;
  oldPrice: number | null;
  trustScore: number;
  merchantConfidence01: number;
  isRepresentative: boolean;
  warehouseConfidence: number;
  duplicateSellerRisk: number;
};

export type CanonicalProductNode = {
  canonicalProductId: string;
  commerceId: string;
  familyGraphId: string;
  variantKey: string;
  normalizedTitle: string;
  identityConfidence: number;
  offers: MerchantOfferLink[];
  merchantCount: number;
  priceMin: number;
  priceMax: number;
  priceMedian: number;
  mergeReasons: IdentityMergeReason[];
};

export type VariantBoundaryTrace = {
  pairKey: string;
  conflict: boolean;
  reasons: string[];
  axesA: Partial<VariantAxes>;
  axesB: Partial<VariantAxes>;
};

export type TrustSignalBundle = {
  merchantConsistency01: number;
  suspiciousDiscountSpike01: number;
  fakeMsrpPattern01: number;
  duplicateSellerIdentity01: number;
  warehouseConfidence01: number;
  explanations: string[];
};

export type PriceSnapshot = {
  commerceId: string;
  store: string;
  link: string;
  price: number;
  oldPrice: number | null;
  observedAt: string;
};

export type IdentityFoundationMeta = {
  version: string;
  enabled: boolean;
  shadowOnly: true;
  query: string;
  inputCount: number;
  canonicalProductCount: number;
  identityCoverage: number;
  falseCollapseBlocked: number;
  duplicateSuppressionCount: number;
  avgIdentityConfidence: number;
  merchantOfferCount: number;
  latencyMs: number;
  graph: { nodeCount: number; edgeCount: number };
};

export type IdentityFoundationResult = {
  products: QuantProduct[];
  meta: IdentityFoundationMeta;
  canonicalProducts: CanonicalProductNode[];
  boundaryTraces: VariantBoundaryTrace[];
  trustByCommerceId: Record<string, TrustSignalBundle>;
  retrievalSurfaceId: string;
};

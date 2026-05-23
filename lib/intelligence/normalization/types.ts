/**
 * QuantAI Phase 0 — Canonical Commerce Identity / Product Normalization types.
 * Commerce Intelligence OS foundation layer (not retrieval, not agents, not new intelligence phases).
 */

import type { QuantProduct } from "@/lib/shoppingScore";

export const NORMALIZATION_VERSION = "p0.1";

export type NormalizationMode = "shadow" | "meta_only" | "dedup" | "collapse";

export type NormalizationCollapseReason =
  | "exact_listing_duplicate"
  | "same_merchant_near_duplicate"
  | "cross_merchant_equivalent"
  | "variant_collapse"
  | "none";

/** Per-listing normalized identity attached to QuantProduct.qiNormalizedCommerce */
export type QiNormalizedCommerceIdentity = {
  /** Stable commerce ID — variant-level equivalent (GTIN/SKU anchored when present). */
  commerceId: string;
  /** Brand + model family graph node (variant-agnostic). */
  familyGraphId: string;
  /** Cross-merchant equivalence class from tray union-find. */
  equivalenceClassId: string;
  /** Deterministic listing fingerprint key. */
  listingKey: string;
  /** Canonical variant spine key (brand::model::variantFingerprint). */
  variantKey: string;
  /** Stable key for ranking-stage deduplication. */
  rankingIdentityKey: string;
  /** Whether this row is the tray representative when apply mode removes duplicates. */
  isRepresentative: boolean;
  /** If collapsed, link of the kept representative listing. */
  duplicateOfLink: string | null;
  collapseReason: NormalizationCollapseReason;
  /** Same-store duplicates were reconciled into this representative. */
  merchantReconciled: boolean;
  /** GTIN / UPC / SKU / MPN / ASIN anchors used in ID generation. */
  identifierAnchors: string[];
  normalizationVersion: string;
};

export type NormalizationEquivalenceGroup = {
  equivalenceClassId: string;
  memberLinks: string[];
  representativeLink: string;
  commerceIds: string[];
  merchantCount: number;
  collapseReason: NormalizationCollapseReason;
};

export type NormalizationTrayMeta = {
  enabled: boolean;
  mode: NormalizationMode;
  apply: boolean;
  version: string;
  inputCount: number;
  outputCount: number;
  duplicateListingCount: number;
  collapsedListingCount: number;
  equivalenceGroupCount: number;
  uniqueCommerceIdCount: number;
  uniqueFamilyGraphIdCount: number;
  top3DuplicateRateBefore: number;
  top3DuplicateRateAfter: number;
  groups: NormalizationEquivalenceGroup[];
  /** Search pipeline stage when recorded (Sprint 2). */
  stage?: NormalizationStage;
  /** Normalization compute latency ms. */
  latencyMs?: number;
  top3UniqueCommerceIdsBefore?: number;
  top3UniqueCommerceIdsAfter?: number;
};

export type NormalizationStage = "post_semantic" | "post_controlled";

export type NormalizationShadowTelemetry = {
  stage: NormalizationStage;
  recordedAt: string;
  enabled: boolean;
  mode: NormalizationMode;
  apply: boolean;
  version: string;
  inputCount: number;
  outputCount: number;
  duplicateListingCount: number;
  collapsedListingCount: number;
  equivalenceGroupCount: number;
  top3DuplicateRateBefore: number;
  top3DuplicateRateAfter: number;
  top3UniqueCommerceIdsBefore: number;
  top3UniqueCommerceIdsAfter: number;
  top5MerchantDuplicatePairs: number;
  clusterCoherenceTop5: number;
  rankingLiftEstimate: number;
  latencyMs: number;
  /** Fraction of tray with canonical commerce IDs (Stage 1). */
  canonicalIdentityCoverage?: number;
  /** Top-5 merchant diversity before normalization pass. */
  merchantDiversityScoreBefore?: number;
  /** Top-5 merchant diversity after normalization pass. */
  merchantDiversityScoreAfter?: number;
  /** Merchant diversity delta (after - before). */
  merchantDiversityDelta?: number;
  /** Semantic rerank identity coherence in top-5 (Stage 1). */
  semanticCoherenceScore?: number;
  /** Equivalence groups incorrectly spanning variant keys. */
  falseCollapseIncidents?: number;
  /** Projected top-3 dup rate if APPLY=true. */
  projectedTop3DuplicateRate?: number;
  /** Projected ranking lift if APPLY=true. */
  projectedRankingLift?: number;
  /** 0–100 readiness for APPLY review. */
  rolloutReadinessScore?: number;
  rolloutReadinessGrade?: "NOT_READY" | "OBSERVING" | "NEAR_READY" | "READY_FOR_APPLY_REVIEW";
};

export type NormalizationOptions = {
  mode?: NormalizationMode;
  apply?: boolean;
  searchQuery?: string;
};

export type NormalizationTrayResult = {
  products: QuantProduct[];
  meta: NormalizationTrayMeta;
};

export type NormalizedListingRecord = {
  product: QuantProduct;
  index: number;
  listingKey: string;
  variantKey: string;
  commerceId: string;
  familyGraphId: string;
  identifierAnchors: string[];
  identityMatchReady: boolean;
};

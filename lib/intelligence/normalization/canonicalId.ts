/**
 * Stable commerce ID strategy — deterministic, retrieval-free, embedding-free.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { extractProductIdentity } from "@/lib/deals/productIdentity";
import { createCanonicalProductIdentity } from "@/lib/intelligence/productIdentity";
import type { NormalizedListingRecord } from "./types";

export function fnv1aHex(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  }
  return (h >>> 0).toString(16);
}

/** Deterministic listing key — same listing always maps to same key within a deployment. */
export function buildListingKey(product: QuantProduct): string {
  const store = product.store.trim().toLowerCase();
  const link = product.link.trim().toLowerCase();
  if (link.length > 8) return `qlk_${fnv1aHex(`${store}::${link}`)}`;
  const title = product.title.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 96);
  return `qlk_${fnv1aHex(`${store}::${title}::${product.price}`)}`;
}

/** Variant-level commerce ID — anchors on identifiers when present, else canonical spine. */
export function buildCommerceId(variantKey: string, identifierAnchors: string[]): string {
  const anchor =
    identifierAnchors.length > 0
      ? [...identifierAnchors].sort().join("|")
      : variantKey;
  return `qcid_${fnv1aHex(anchor)}`;
}

/** Family graph node — brand + model only (variant collapse plane). */
export function buildFamilyGraphId(brandKey: string, modelKey: string): string {
  return `qcfg_${fnv1aHex(`${brandKey}::${modelKey}`)}`;
}

/** Equivalence class ID from sorted member commerce IDs (tray-local but stable for same cluster). */
export function buildEquivalenceClassId(commerceIds: string[]): string {
  const sorted = [...commerceIds].sort();
  return `qcec_${fnv1aHex(sorted.join("~"))}`;
}

/**
 * Ranking-stage dedup key — prefers commerce ID; falls back to listing key.
 * Used by semantic rerank and tray dedup pipeline.
 */
export function buildRankingIdentityKey(commerceId: string, listingKey: string, store: string): string {
  return `qrk_${fnv1aHex(`${commerceId}::${store.toLowerCase()}::${listingKey}`)}`;
}

export function extractIdentifierAnchors(product: QuantProduct): string[] {
  const id = extractProductIdentity(product);
  return [...new Set(id.identifiers.map((x) => x.toUpperCase()).filter(Boolean))].sort();
}

/** Build normalized listing record from raw product (pre-enrichment hook). */
export function buildNormalizedListingRecord(product: QuantProduct, index: number): NormalizedListingRecord {
  const spine = createCanonicalProductIdentity(product);
  const identifierAnchors = extractIdentifierAnchors(product);
  const listingKey = buildListingKey(product);
  const variantKey = spine.canonicalKey;
  const commerceId = buildCommerceId(variantKey, identifierAnchors);
  const familyGraphId = buildFamilyGraphId(spine.brandKey, spine.modelKey);

  return {
    product,
    index,
    listingKey,
    variantKey,
    commerceId,
    familyGraphId,
    identifierAnchors,
    identityMatchReady: spine.brandKey !== "unknown" || identifierAnchors.length > 0,
  };
}

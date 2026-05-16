/**
 * QuantAI canonical product identity — cross-retailer matching spine (intelligence layer).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { extractProductIdentity, type ProductIdentity } from "@/lib/deals/productIdentity";
import { identityMatchScore } from "@/lib/deals/identityMatchScore";
import {
  normalizeColorKey,
  normalizeConditionLabel,
  normalizeRegionalTitleNoise,
  normalizeSizeKey,
  normalizeStorageGb,
} from "@/lib/intelligence/variantNormalization";

export type CanonicalProductIdentity = {
  /** Stable family key within tray */
  canonicalKey: string;
  brandKey: string;
  modelKey: string;
  variantFingerprint: string;
  condition: ReturnType<typeof normalizeConditionLabel>;
  normalizedTitleHint: string;
};

/** Collapse brand + primary model tokens for identity keys. */
export function normalizeBrandModel(identity: ProductIdentity): { brandKey: string; modelKey: string } {
  const brandKey = (identity.brands[0] ?? "unknown").toLowerCase();
  const models = [...identity.models].map((m) => m.toLowerCase().replace(/\s+/g, "")).sort();
  const modelKey = models.slice(0, 3).join("+") || identity.normalizedTitle.slice(0, 48).replace(/\s+/g, "_");
  return { brandKey, modelKey };
}

/** Storage + color + size + condition — same real product variants. */
export function extractVariantFingerprint(p: QuantProduct, identity: ProductIdentity): string {
  const blob = `${p.title} ${p.extensions.join(" ")} ${p.availability ?? ""}`;
  const parts: string[] = [];
  const gb = normalizeStorageGb(blob);
  if (gb != null) parts.push(`s${gb}`);
  const c = normalizeColorKey(blob);
  if (c) parts.push(`c${c}`);
  const sz = normalizeSizeKey(blob);
  if (sz) parts.push(`z${sz}`);
  for (const [k, v] of Object.entries(identity.specHints)) {
    parts.push(`${k}:${v.replace(/\s+/g, "")}`);
  }
  parts.push(`cond:${normalizeConditionLabel(blob)}`);
  return parts.sort().join("|");
}

export function createCanonicalProductIdentity(p: QuantProduct): CanonicalProductIdentity {
  const id = extractProductIdentity(p);
  const { brandKey, modelKey } = normalizeBrandModel(id);
  const variantFingerprint = extractVariantFingerprint(p, id);
  const blob = `${p.title} ${p.extensions.join(" ")}`;
  const condition = normalizeConditionLabel(blob);
  const normalizedTitleHint = normalizeRegionalTitleNoise(id.normalizedTitle).slice(0, 96);
  const canonicalKey = [brandKey, modelKey, variantFingerprint].join("::");
  return {
    canonicalKey,
    brandKey,
    modelKey,
    variantFingerprint,
    condition,
    normalizedTitleHint,
  };
}

/** 0–1 confidence two rows are the same product (uses deals identity + price sanity). */
export function buildProductIdentityConfidence(
  a: QuantProduct,
  b: QuantProduct,
  identityA: ProductIdentity,
  identityB: ProductIdentity,
  peerMedianPrice: number
): number {
  return identityMatchScore(identityA, identityB, a.price, b.price, peerMedianPrice);
}

/** Same SKU across different storefronts (not duplicate listings on one store). */
export function detectCrossRetailIdentity(
  a: QuantProduct,
  b: QuantProduct,
  confidence01: number
): boolean {
  if (confidence01 < 0.72) return false;
  const sa = a.store.toLowerCase().trim();
  const sb = b.store.toLowerCase().trim();
  if (sa === sb) return confidence01 >= 0.88;
  return true;
}

export type { ProductIdentity };

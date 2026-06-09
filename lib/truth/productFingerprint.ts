/**
 * Phase 1C — Product fingerprinting for SKU resolution fallback.
 */

import { extractProductIdentity } from "@/lib/deals/productIdentity";
import { normalizeProductTitle } from "@/lib/deals/normalizeTitle";
import type { QuantProduct } from "@/lib/shoppingScore";
import { createCanonicalProductIdentity } from "@/lib/intelligence/productIdentity";
import {
  normalizeColorKey,
  normalizeSizeKey,
  normalizeStorageGb,
} from "@/lib/intelligence/variantNormalization";
import type { ProductFingerprint } from "@/lib/truth/skuIdentityTypes";

function modelTokensFromTitle(title: string): string[] {
  const norm = normalizeProductTitle(title);
  return norm
    .split(" ")
    .filter((token) => token.length > 1 && !/^(the|and|with|for|new|pro|max|plus)$/i.test(token))
    .slice(0, 12);
}

/** Build deterministic fingerprint signals from a listing. */
export function buildProductFingerprint(
  product: QuantProduct,
  searchQuery = ""
): ProductFingerprint {
  const identity = extractProductIdentity(product);
  const canonical = createCanonicalProductIdentity(product);
  const blob = `${product.title} ${product.extensions?.join(" ") ?? ""} ${searchQuery}`;

  const capacityGb = normalizeStorageGb(blob);
  const capacity = capacityGb != null ? `${capacityGb}gb` : identity.specHints.storage ?? null;
  const color = normalizeColorKey(blob) || null;
  const size = normalizeSizeKey(blob) || null;

  const fingerprintKey = [
    canonical.brandKey,
    canonical.modelKey,
    canonical.variantFingerprint,
    normalizeProductTitle(product.title).slice(0, 64),
  ]
    .filter(Boolean)
    .join("::");

  return {
    brand: identity.brands[0] ?? canonical.brandKey,
    title: product.title.trim(),
    normalizedTitle: identity.normalizedTitle,
    specs: identity.specHints,
    capacity,
    color,
    size,
    modelTokens: [...new Set([...identity.models, ...modelTokensFromTitle(product.title)])].slice(0, 12),
    fingerprintKey,
  };
}

export function fingerprintStableKey(fingerprint: ProductFingerprint): string {
  return fingerprint.fingerprintKey;
}

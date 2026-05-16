/**
 * QuantAI universal product identity — retailer-agnostic fingerprint + cross-store confidence.
 * Pairs with `universalListingIdentity.ts` (junk/accessory/contamination plane) and
 * `merchantIntelligence.ts` (merchant-native routing confidence).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { extractProductIdentity, type ProductIdentity } from "@/lib/deals/productIdentity";
import { normalizeProductTitle } from "@/lib/deals/normalizeTitle";
import {
  createCanonicalProductIdentity,
  buildProductIdentityConfidence,
} from "@/lib/intelligence/productIdentity";
import {
  normalizeColorKey,
  normalizeConditionLabel,
  normalizeRegionalTitleNoise,
  normalizeSizeKey,
  normalizeStorageGb,
} from "@/lib/intelligence/variantNormalization";

export type UniversalProductFingerprint = {
  /** Full variant-aware key (same as canonical spine). */
  canonicalKey: string;
  /** Soft title stem for fuzzy family hints. */
  retailerAgnosticStem: string;
  /** Parsed variant tokens (storage, color, size, condition). */
  variantTokens: string[];
};

/** Collapse retailer/marketing noise for comparable titles. */
export function normalizeTitlesAcrossRetailers(title: string): string {
  return normalizeRegionalTitleNoise(normalizeProductTitle(title)).replace(/\s+/g, " ").trim();
}

export function detectModelVariantColorVersion(
  product: QuantProduct,
  identity: ProductIdentity
): { modelHint: string; tokens: string[] } {
  const blob = `${product.title} ${product.extensions.join(" ")}`;
  const tokens: string[] = [];
  const gb = normalizeStorageGb(blob);
  if (gb != null) tokens.push(`storage:${gb}gb`);
  const c = normalizeColorKey(blob);
  if (c) tokens.push(`color:${c}`);
  const sz = normalizeSizeKey(blob);
  if (sz) tokens.push(`size:${sz}`);
  tokens.push(`cond:${normalizeConditionLabel(blob)}`);
  const models = [...identity.models].map((m) => m.toLowerCase().trim()).filter(Boolean);
  const modelHint = models[0] ?? identity.normalizedTitle.slice(0, 32);
  return { modelHint, tokens: tokens.sort() };
}

export function buildUniversalProductFingerprint(product: QuantProduct): UniversalProductFingerprint {
  const id = extractProductIdentity(product);
  const canon = createCanonicalProductIdentity(product);
  const { tokens } = detectModelVariantColorVersion(product, id);
  return {
    canonicalKey: canon.canonicalKey,
    retailerAgnosticStem: normalizeTitlesAcrossRetailers(product.title).slice(0, 96),
    variantTokens: tokens,
  };
}

/** Softer bucket than full canonical (brand + model spine, variants ignored). */
export function fuzzyFamilyGroupingKey(fp: UniversalProductFingerprint): string {
  const parts = fp.canonicalKey.split("::");
  return parts.length >= 2 ? `${parts[0]}::${parts[1]}` : fp.canonicalKey;
}

export function crossStoreIdentityConfidence01(
  a: QuantProduct,
  b: QuantProduct,
  identityA: ProductIdentity,
  identityB: ProductIdentity,
  peerMedianPrice: number
): number {
  return buildProductIdentityConfidence(a, b, identityA, identityB, peerMedianPrice);
}

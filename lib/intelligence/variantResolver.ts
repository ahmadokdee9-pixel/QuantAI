/**
 * QuantAI variant resolver — human-facing variant axes + duplicate detection.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { extractProductIdentity } from "@/lib/deals/productIdentity";
import { combinedTitleSimilarity } from "@/lib/deals/normalizeTitle";
import {
  normalizeColorKey,
  normalizeConditionLabel,
  normalizeRegionalTitleNoise,
  normalizeSizeKey,
  normalizeStorageGb,
} from "@/lib/intelligence/variantNormalization";

export type ResolvedVariantAxes = {
  storageGb: number | null;
  colorKey: string | null;
  sizeKey: string | null;
  genderKey: ReturnType<typeof normalizeGenderKey>;
  editionKey: string | null;
  condition: ReturnType<typeof normalizeConditionLabel>;
  regionalTitle: string;
};

const GENDER_RX: [RegExp, "men" | "women" | "unisex"][] = [
  [/\b(men|mens|men's|homme|heren)\b/i, "men"],
  [/\b(women|womens|women's|ladies|femme|dames)\b/i, "women"],
  [/\b(unisex)\b/i, "unisex"],
];

export function normalizeGenderKey(blob: string): "men" | "women" | "unisex" | null {
  const b = blob.toLowerCase();
  for (const [re, g] of GENDER_RX) {
    if (re.test(b)) return g;
  }
  return null;
}

const EDITION_RX =
  /\b(standard|deluxe|ultimate|collector|limited|anniversary|special edition|digital|physical|bundle)\b/i;

export function normalizeEditionKey(blob: string): string | null {
  const m = blob.match(EDITION_RX);
  return m ? m[0]!.toLowerCase().replace(/\s+/g, "_") : null;
}

/** Regional / language noise strip for duplicate checks. */
export function normalizeRegionalProductName(title: string): string {
  return normalizeRegionalTitleNoise(title).replace(/\s+/g, " ").trim();
}

export function resolveVariantAxes(product: QuantProduct): ResolvedVariantAxes {
  const blob = `${product.title} ${product.extensions.join(" ")}`;
  return {
    storageGb: normalizeStorageGb(blob),
    colorKey: normalizeColorKey(blob),
    sizeKey: normalizeSizeKey(blob),
    genderKey: normalizeGenderKey(blob),
    editionKey: normalizeEditionKey(blob),
    condition: normalizeConditionLabel(blob),
    regionalTitle: normalizeRegionalProductName(product.title),
  };
}

/** Same-store near-duplicate rows (relist / feed dupes). */
export function areNearDuplicateListings(a: QuantProduct, b: QuantProduct): boolean {
  if (a.store.toLowerCase().trim() !== b.store.toLowerCase().trim()) return false;
  const ia = extractProductIdentity(a);
  const ib = extractProductIdentity(b);
  const sim = combinedTitleSimilarity(ia.normalizedTitle, ib.normalizedTitle);
  if (sim < 0.92) return false;
  if (a.price <= 0 || b.price <= 0) return sim >= 0.97;
  const rel = Math.abs(a.price - b.price) / Math.max(a.price, b.price);
  return rel < 0.03;
}

/**
 * Phase 38 — Product Universe Engine.
 * Connect every offer to same model/version/storage/color/condition.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { createCanonicalProductIdentity } from "@/lib/intelligence/productIdentity";
import { buildUnifiedMarketGroups } from "@/lib/intelligence/unifiedMarketMatching";
import {
  normalizeColorKey,
  normalizeConditionLabel,
  normalizeSizeKey,
  normalizeStorageGb,
} from "@/lib/intelligence/variantNormalization";

export type UniverseOfferRef = {
  link: string;
  store: string;
  price: number;
  condition: string;
  variantKey: string;
};

export type ProductUniverse = {
  version: 1;
  universeId: string;
  modelKey: string;
  versionKey: string;
  storage: string;
  color: string;
  condition: string;
  offers: UniverseOfferRef[];
  offerCount: number;
  lowestPrice: number;
  medianPrice: number;
  highestPrice: number;
};

function variantKey(product: QuantProduct): string {
  const blob = `${product.title} ${product.extensions?.join(" ") ?? ""}`;
  const storage = normalizeStorageGb(blob);
  const color = normalizeColorKey(blob);
  const size = normalizeSizeKey(blob);
  const condition = normalizeConditionLabel(blob);
  return [storage != null ? `s${storage}` : "", color ? `c${color}` : "", size ? `z${size}` : "", `cond:${condition}`]
    .filter(Boolean)
    .join("|");
}

function median(nums: number[]): number {
  const s = nums.filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Build product universe for one listing within tray. */
export function buildProductUniverse(
  product: QuantProduct,
  tray: QuantProduct[],
  searchQuery = ""
): ProductUniverse {
  const groups = buildUnifiedMarketGroups(tray, searchQuery);
  const canonical = createCanonicalProductIdentity(product);
  const vk = variantKey(product);

  let members = tray.filter((p) => createCanonicalProductIdentity(p).canonicalKey === canonical.canonicalKey);
  for (const group of groups) {
    const groupMembers = group.memberIndices.map((i) => tray[i]!);
    if (groupMembers.some((p) => p.link === product.link)) {
      members = groupMembers;
      break;
    }
  }

  const offers: UniverseOfferRef[] = members.map((p) => ({
    link: p.link,
    store: p.store,
    price: p.price,
    condition: normalizeConditionLabel(`${p.title} ${p.availability ?? ""}`),
    variantKey: variantKey(p),
  }));

  const prices = offers.map((o) => o.price).filter((n) => n > 0);

  return {
    version: 1,
    universeId: `${canonical.canonicalKey}:${vk}`,
    modelKey: canonical.modelKey,
    versionKey: canonical.canonicalKey,
    storage: normalizeStorageGb(product.title) != null ? `${normalizeStorageGb(product.title)}GB` : "standard",
    color: normalizeColorKey(product.title) || "standard",
    condition: normalizeConditionLabel(product.title),
    offers,
    offerCount: offers.length,
    lowestPrice: prices.length ? Math.min(...prices) : product.price,
    medianPrice: Math.round(median(prices)),
    highestPrice: prices.length ? Math.max(...prices) : product.price,
  };
}

export function findUniverseForLink(universes: Map<string, ProductUniverse>, link: string): ProductUniverse | null {
  for (const universe of universes.values()) {
    if (universe.offers.some((o) => o.link === link)) return universe;
  }
  return null;
}

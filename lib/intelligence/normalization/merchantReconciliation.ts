/**
 * Merchant listing reconciliation — same-store near-duplicate detection.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { combinedTitleSimilarity } from "@/lib/deals/normalizeTitle";
import { extractProductIdentity } from "@/lib/deals/productIdentity";
import type { NormalizedListingRecord } from "./types";
import { buildListingKey } from "./canonicalId";

const SAME_STORE_TITLE_SIM = 0.92;
const SAME_STORE_PRICE_TOLERANCE = 0.03;

function sameStore(a: QuantProduct, b: QuantProduct): boolean {
  return a.store.trim().toLowerCase() === b.store.trim().toLowerCase();
}

function priceNear(a: number, b: number): boolean {
  if (a <= 0 || b <= 0) return false;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi - lo) / hi <= SAME_STORE_PRICE_TOLERANCE;
}

/** True when two listings are the same merchant offer duplicated with near-identical title/price. */
export function areSameMerchantNearDuplicates(a: QuantProduct, b: QuantProduct): boolean {
  if (!sameStore(a, b)) return false;
  if (a.link.trim().toLowerCase() === b.link.trim().toLowerCase() && a.link.length > 8) return true;
  const ia = extractProductIdentity(a);
  const ib = extractProductIdentity(b);
  const sim = combinedTitleSimilarity(ia.normalizedTitle, ib.normalizedTitle);
  return sim >= SAME_STORE_TITLE_SIM && priceNear(a.price, b.price);
}

/** Group same-merchant near-duplicates; returns map link → representative link. */
export function reconcileMerchantDuplicates(
  records: NormalizedListingRecord[]
): Map<string, { representativeLink: string; merchantReconciled: boolean }> {
  const resolution = new Map<string, { representativeLink: string; merchantReconciled: boolean }>();

  for (const rec of records) {
    resolution.set(rec.product.link, {
      representativeLink: rec.product.link,
      merchantReconciled: false,
    });
  }

  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const a = records[i]!;
      const b = records[j]!;
      if (!areSameMerchantNearDuplicates(a.product, b.product)) continue;

      const scoreA = representativeScore(a.product);
      const scoreB = representativeScore(b.product);
      const keep = scoreA >= scoreB ? a : b;
      const drop = scoreA >= scoreB ? b : a;

      resolution.set(drop.product.link, {
        representativeLink: keep.product.link,
        merchantReconciled: true,
      });
      const keepEntry = resolution.get(keep.product.link);
      if (keepEntry) {
        resolution.set(keep.product.link, { ...keepEntry, merchantReconciled: true });
      }
    }
  }

  return resolution;
}

/** Exact listing key duplicates (different rows, same listing key). */
export function findExactListingDuplicateGroups(
  records: NormalizedListingRecord[]
): Map<string, NormalizedListingRecord[]> {
  const byKey = new Map<string, NormalizedListingRecord[]>();
  for (const rec of records) {
    const key = buildListingKey(rec.product);
    const list = byKey.get(key) ?? [];
    list.push(rec);
    byKey.set(key, list);
  }
  const dupes = new Map<string, NormalizedListingRecord[]>();
  for (const [key, members] of byKey) {
    if (members.length > 1) dupes.set(key, members);
  }
  return dupes;
}

function representativeScore(p: QuantProduct): number {
  const rating = Number(p.rating);
  const ratingBoost = Number.isFinite(rating) ? rating * 10 : 0;
  const reviewBoost = p.reviewsCount != null && p.reviewsCount > 0 ? Math.log10(p.reviewsCount + 1) : 0;
  const pricePenalty = p.price > 0 ? p.price * 0.001 : 100;
  return ratingBoost + reviewBoost - pricePenalty;
}

export { representativeScore };

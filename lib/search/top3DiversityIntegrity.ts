/**
 * Phase 9.2 — Top-3 diversity protection (merchant, title, category).
 * Post-ranking tray reorder only; does not mutate intelligence layers.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import {
  applyMerchantDiversitySafeguard,
  normalizeMerchantKey,
  rankScore,
} from "@/lib/search/merchantDiversityRerank";

export type Top3DiversityMeta = {
  applied: boolean;
  top3MerchantMax: number;
  nearDuplicateTitlesRemoved: number;
  merchantSwaps: number;
  categorySwaps: number;
  top3MerchantCounts: Record<string, number>;
  top3NearDuplicateTitles: number;
};

/** Normalized title fingerprint for near-duplicate detection (matches QA harness). */
export function titleFingerprint(title: string): string {
  return String(title ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 6)
    .join(" ");
}

export function countNearDuplicateTitlesInTop(products: QuantProduct[], topN = 3): number {
  const window = products.slice(0, topN);
  const seen = new Map<string, number>();
  let dupes = 0;
  for (const p of window) {
    const key = titleFingerprint(p.title);
    if (!key) continue;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n >= 2) dupes += 1;
  }
  return dupes;
}

export function merchantCountsTop3(products: QuantProduct[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of products.slice(0, 3)) {
    const k = normalizeMerchantKey(p);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function categoryBucket(title: string): string {
  const t = title.toLowerCase();
  if (/\b(case|cover|hülle|hoes)\b/i.test(t)) return "accessory";
  if (/\b(pro\s*max|pro|plus|ultra|mini|se)\b/i.test(t)) return "variant";
  if (/\b(refurb|renewed|used|open box)\b/i.test(t)) return "condition";
  return "standard";
}

/** Demote near-duplicate titles within top-N while preserving rank #1. */
function demoteNearDuplicateTitles(products: QuantProduct[], topN = 3): {
  products: QuantProduct[];
  removed: number;
} {
  if (products.length <= 1) return { products, removed: 0 };
  const out = [...products];
  const target = Math.min(topN, out.length);
  const used = new Set<number>();
  const head: QuantProduct[] = [];
  const titleSeen = new Set<string>();
  let removed = 0;

  if (out[0]) {
    head.push(out[0]);
    used.add(0);
    const fp = titleFingerprint(out[0].title);
    if (fp) titleSeen.add(fp);
  }

  while (head.length < target) {
    let picked = -1;
    for (let i = 0; i < out.length; i++) {
      if (used.has(i)) continue;
      const fp = titleFingerprint(out[i]!.title);
      if (fp && titleSeen.has(fp)) continue;
      picked = i;
      break;
    }
    if (picked < 0) break;
    const pick = out[picked]!;
    const fp = titleFingerprint(pick.title);
    used.add(picked);
    head.push(pick);
    if (fp) titleSeen.add(fp);
  }

  const tail = out.filter((_, i) => !used.has(i));
  const padded = [...head];
  for (const candidate of tail) {
    if (padded.length >= target) break;
    const fp = titleFingerprint(candidate.title);
    if (fp && titleSeen.has(fp)) continue;
    padded.push(candidate);
    if (fp) titleSeen.add(fp);
  }
  const paddedLinks = new Set(padded.map((p) => p.link));
  const rest = tail.filter((p) => !paddedLinks.has(p.link));
  return { products: [...padded, ...rest].map((p, i) => ({ ...p, qiRank: i })), removed };
}

/** When top-3 shares one category bucket, promote an alternate bucket from tail. */
function enforceCategoryDiversityInTop3(products: QuantProduct[]): {
  products: QuantProduct[];
  swaps: number;
} {
  if (products.length <= 3) return { products, swaps: 0 };
  const out = [...products];
  const buckets = out.slice(0, 3).map((p) => categoryBucket(p.title));
  const dominant = buckets[0]!;
  if (buckets.every((b) => b === dominant)) {
    let swap = -1;
    for (let j = 3; j < out.length; j++) {
      if (categoryBucket(out[j]!.title) !== dominant) {
        swap = j;
        break;
      }
    }
    if (swap >= 0) {
      const tmp = out[2]!;
      out[2] = out[swap]!;
      out[swap] = tmp;
      return { products: out.map((p, i) => ({ ...p, qiRank: i })), swaps: 1 };
    }
  }
  return { products: out, swaps: 0 };
}

/** Soft penalty map for merchant concentration already present in top slots. */
export function merchantConcentrationPenalty(
  product: QuantProduct,
  topCounts: Map<string, number>,
  slotIndex: number
): number {
  if (slotIndex >= 3) return 0;
  const key = normalizeMerchantKey(product);
  const count = topCounts.get(key) ?? 0;
  if (count <= 1) return 0;
  return count * 8 + (slotIndex === 0 ? 0 : 4);
}

/**
 * Apply strict top-3 diversity: max 1 listing per merchant in top 3,
 * near-duplicate title demotion, optional category spread.
 */
export function applyTop3DiversityProtection(
  products: QuantProduct[],
  opts: { preserveTop1?: boolean } = {}
): { products: QuantProduct[]; meta: Top3DiversityMeta } {
  const preserveTop1 = opts.preserveTop1 !== false;
  if (products.length <= 1) {
    return {
      products,
      meta: {
        applied: false,
        top3MerchantMax: 1,
        nearDuplicateTitlesRemoved: 0,
        merchantSwaps: 0,
        categorySwaps: 0,
        top3MerchantCounts: merchantCountsTop3(products),
        top3NearDuplicateTitles: countNearDuplicateTitlesInTop(products),
      },
    };
  }

  let ordered = applyMerchantDiversitySafeguard(products, {
    topN: 3,
    maxPerMerchant: 1,
    preserveTop1,
  });

  const categoryPass = enforceCategoryDiversityInTop3(ordered);
  ordered = categoryPass.products;

  ordered = applyMerchantDiversitySafeguard(ordered, {
    topN: 3,
    maxPerMerchant: 1,
    preserveTop1,
  });

  const beforeDupes = countNearDuplicateTitlesInTop(ordered);
  const deduped = demoteNearDuplicateTitles(ordered, 3);
  ordered = deduped.products;

  const afterDupes = countNearDuplicateTitlesInTop(ordered);
  const merchantCounts = merchantCountsTop3(ordered);

  return {
    products: ordered,
    meta: {
      applied: true,
      top3MerchantMax: 1,
      nearDuplicateTitlesRemoved: deduped.removed,
      merchantSwaps: Math.max(0, beforeDupes - afterDupes + categoryPass.swaps),
      categorySwaps: categoryPass.swaps,
      top3MerchantCounts: merchantCounts,
      top3NearDuplicateTitles: afterDupes,
    },
  };
}

/** Greedy rerank with merchant concentration penalties in the top window. */
export function applyMerchantConcentrationControls(products: QuantProduct[]): QuantProduct[] {
  if (products.length <= 3) return products;

  const used = new Set<number>();
  const ordered: QuantProduct[] = [];
  const merchantCounts = new Map<string, number>();
  const penaltyWindow = 5;

  while (ordered.length < products.length) {
    let bestIdx = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < products.length; i++) {
      if (used.has(i)) continue;
      const p = products[i]!;
      const key = normalizeMerchantKey(p);
      const penalty =
        ordered.length < penaltyWindow ? merchantConcentrationPenalty(p, merchantCounts, ordered.length) : 0;
      const score = rankScore(p) - penalty;
      if (score > bestScore || (Math.abs(score - bestScore) < 0.01 && i < bestIdx)) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    used.add(bestIdx);
    const pick = products[bestIdx]!;
    ordered.push(pick);
    const k = normalizeMerchantKey(pick);
    merchantCounts.set(k, (merchantCounts.get(k) ?? 0) + 1);
  }

  return ordered.map((p, i) => ({ ...p, qiRank: i }));
}

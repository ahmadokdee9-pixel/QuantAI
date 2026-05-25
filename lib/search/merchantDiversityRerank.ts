/**
 * Lightweight merchant diversity safeguard — final ranking only.
 * Preserves #1; caps same merchant in top N; does not mutate intelligence layers.
 */

import type { QuantProduct } from "@/lib/shoppingScore";

export type MerchantDiversityOptions = {
  /** Slots to diversify (default 5). */
  topN?: number;
  /** Max listings per merchant inside topN (default 2). */
  maxPerMerchant?: number;
  /** Keep index 0 fixed (default true). */
  preserveTop1?: boolean;
};

export function normalizeMerchantKey(product: QuantProduct): string {
  const raw = String(product.store ?? "").trim().toLowerCase();
  if (raw) return raw;
  try {
    const host = new URL(product.link).hostname.replace(/^www\./i, "").toLowerCase();
    return host || "unknown";
  } catch {
    return "unknown";
  }
}

export function rankScore(product: QuantProduct): number {
  if (product.qiComposite != null && Number.isFinite(product.qiComposite)) {
    return product.qiComposite;
  }
  if (product.qiModelLayer != null && Number.isFinite(product.qiModelLayer)) {
    return product.qiModelLayer;
  }
  const rank = product.qiRank;
  if (rank != null && Number.isFinite(rank)) return 1000 - rank;
  return 0;
}

export function merchantCountsInTop(
  products: QuantProduct[],
  topN = 5
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of products.slice(0, topN)) {
    const k = normalizeMerchantKey(p);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/** True when any merchant appears more than maxPer times in the first topN slots. */
export function topNeedsMerchantDiversity(
  products: QuantProduct[],
  topN = 5,
  maxPerMerchant = 2
): boolean {
  const counts = merchantCountsInTop(products, topN);
  for (const n of counts.values()) {
    if (n > maxPerMerchant) return true;
  }
  return false;
}

/**
 * Reorder tray so top `topN` has at most `maxPerMerchant` per merchant.
 * Rank #1 unchanged by default; fills top window in relevance order, then demotes overflow.
 */
export function applyMerchantDiversitySafeguard(
  products: QuantProduct[],
  opts: MerchantDiversityOptions = {}
): QuantProduct[] {
  const topN = opts.topN ?? 5;
  const maxPer = opts.maxPerMerchant ?? 2;
  const preserveTop1 = opts.preserveTop1 !== false;

  if (products.length <= 1 || topN < 2) {
    return products.map((p, i) => ({ ...p, qiRank: i }));
  }

  if (!topNeedsMerchantDiversity(products, topN, maxPer)) {
    return products.map((p, i) => ({ ...p, qiRank: i }));
  }

  const head: QuantProduct[] = [];
  const counts = new Map<string, number>();
  const used = new Set<number>();

  if (preserveTop1 && products[0]) {
    head.push(products[0]);
    counts.set(normalizeMerchantKey(products[0]), 1);
    used.add(0);
  }

  const targetLen = Math.min(topN, products.length);
  while (head.length < targetLen) {
    let picked = -1;
    for (let i = 0; i < products.length; i++) {
      if (used.has(i)) continue;
      const k = normalizeMerchantKey(products[i]);
      if ((counts.get(k) ?? 0) < maxPer) {
        picked = i;
        break;
      }
    }
    if (picked < 0) break;
    used.add(picked);
    const p = products[picked];
    head.push(p);
    const k = normalizeMerchantKey(p);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const tail: QuantProduct[] = [];
  for (let i = 0; i < products.length; i++) {
    if (!used.has(i)) tail.push(products[i]);
  }

  let ordered = [...head, ...tail];
  if (ordered.length > topN) {
    ordered = demoteMerchantOverflow(ordered, topN, maxPer, preserveTop1);
  }
  return ordered.map((p, i) => ({ ...p, qiRank: i }));
}

/** Demote lowest-scoring overflow merchant rows (swap toward tail with different merchant). */
function demoteMerchantOverflow(
  products: QuantProduct[],
  topN: number,
  maxPer: number,
  preserveTop1: boolean
): QuantProduct[] {
  const out = [...products];
  const window = Math.min(topN, out.length);
  const merchants = new Set<string>();
  for (let i = 0; i < window; i++) merchants.add(normalizeMerchantKey(out[i]));

  for (const merchant of merchants) {
    for (let pass = 0; pass < out.length; pass++) {
      const slots: number[] = [];
      for (let i = 0; i < window; i++) {
        if (normalizeMerchantKey(out[i]) === merchant) slots.push(i);
      }
      if (slots.length <= maxPer) break;

      const ranked = slots
        .filter((i) => !(preserveTop1 && i === 0))
        .sort((a, b) => rankScore(out[a]) - rankScore(out[b]));
      const demoteCount = slots.length - maxPer;
      const toDemote = ranked.slice(0, demoteCount);
      if (!toDemote.length) break;

      let moved = false;
      for (const idx of toDemote) {
        let swap = -1;
        for (let j = out.length - 1; j >= topN; j--) {
          if (normalizeMerchantKey(out[j]) !== merchant) {
            swap = j;
            break;
          }
        }
        if (swap < 0) {
          for (let j = out.length - 1; j > idx; j--) {
            if (normalizeMerchantKey(out[j]) !== merchant) {
              swap = j;
              break;
            }
          }
        }
        if (swap < 0) continue;
        const tmp = out[idx];
        out[idx] = out[swap];
        out[swap] = tmp;
        moved = true;
      }
      if (!moved) break;
    }
  }

  return out;
}

import type { QuantProduct } from "@/lib/shoppingScore";
import {
  getFinalComposite,
  getStoreTrustScore,
} from "@/lib/shoppingScore";
import {
  resolveCanonicalSearchRank,
  type CanonicalSearchRankResult,
} from "@/lib/truth/canonicalSearchRank";
import {
  sortProductsByTrustDrivenRank,
  type TrustDrivenRankOptions,
} from "@/lib/truth/trustDrivenCompositeRank";
import type { PurchaseIntent } from "@/lib/truth/unifiedIntentPipeline";

export type { PurchaseIntent, TrustDrivenRankOptions, CanonicalSearchRankResult };
export { purchaseIntentFromQuery } from "@/lib/truth/unifiedIntentPipeline";
export { resolveCanonicalSearchRank, sortProductsByTrustDrivenRank };

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function normalizeStore(store: string): string {
  return store.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Collapse near-duplicate rows from the same retailer (re-list noise, feed dupes).
 * Preserves first-seen order among survivors.
 */
export function dedupeProductList(list: QuantProduct[]): QuantProduct[] {
  if (list.length < 2) return list;

  const groups = new Map<string, QuantProduct[]>();
  for (const p of list) {
    const key = `${normalizeStore(p.store)}::${normalizeTitle(p.title)}`;
    const g = groups.get(key);
    if (g) g.push(p);
    else groups.set(key, [p]);
  }

  const keep = new Set<string>();

  for (const [, g] of groups) {
    if (g.length === 1) {
      keep.add(g[0].link);
      continue;
    }
    const priceClusters: QuantProduct[][] = [];
    for (const p of g) {
      let placed = false;
      for (const c of priceClusters) {
        const ref = c[0];
        if (ref.price <= 0 || p.price <= 0) {
          if (ref.price === p.price) {
            c.push(p);
            placed = true;
            break;
          }
          continue;
        }
        const rel = Math.abs(p.price - ref.price) / Math.max(ref.price, p.price);
        if (rel < 0.022) {
          c.push(p);
          placed = true;
          break;
        }
      }
      if (!placed) priceClusters.push([p]);
    }
    for (const c of priceClusters) {
      c.sort((a, b) => getFinalComposite(b, list) - getFinalComposite(a, list));
      keep.add(c[0].link);
    }
  }

  return list.filter((p) => keep.has(p.link));
}

/**
 * When two ultra-low-trust rows share the same title and nearly the same price, keep the stronger composite only.
 */
function dedupeLowTrustNoiseAcrossStores(list: QuantProduct[]): QuantProduct[] {
  if (list.length < 2) return list;
  const byTitle = new Map<string, QuantProduct[]>();
  for (const p of list) {
    const k = normalizeTitle(p.title);
    if (k.length < 8) continue;
    const g = byTitle.get(k) ?? [];
    g.push(p);
    byTitle.set(k, g);
  }
  const drop = new Set<string>();
  for (const [, g] of byTitle) {
    if (g.length < 2) continue;
    const sorted = [...g].sort((a, b) => getFinalComposite(b, list) - getFinalComposite(a, list));
    const head = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const b = sorted[i];
      const ta = getStoreTrustScore(head.store);
      const tb = getStoreTrustScore(b.store);
      if (ta >= 55 || tb >= 55) continue;
      if (head.price <= 0 || b.price <= 0) continue;
      const rel = Math.abs(head.price - b.price) / Math.max(head.price, b.price);
      if (rel < 0.026) drop.add(b.link);
    }
  }
  if (drop.size === 0) return list;
  return list.filter((p) => !drop.has(p.link));
}

/** Dedupe retailer noise, then collapse suspicious cross-store duplicates. */
export function dedupeSearchTray(list: QuantProduct[]): QuantProduct[] {
  return dedupeLowTrustNoiseAcrossStores(dedupeProductList(list));
}

/** Trust-driven composite ordering — canonical Phase A authority. */
export function sortByCompositeRankEnhanced(
  list: QuantProduct[],
  query: string,
  options?: TrustDrivenRankOptions
): QuantProduct[] {
  if (list.length === 0) return list;
  return resolveCanonicalSearchRank(list, query, options).orderedProducts;
}

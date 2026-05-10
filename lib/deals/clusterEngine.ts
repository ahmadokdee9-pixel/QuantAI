import type { QuantProduct } from "@/lib/shoppingScore";
import { combinedTitleSimilarity } from "./normalizeTitle";

const MERGE_THRESHOLD = 0.36;

function find(parent: number[], i: number): number {
  if (parent[i] !== i) parent[i] = find(parent, parent[i]);
  return parent[i];
}

function union(parent: number[], a: number, b: number): void {
  const ra = find(parent, a);
  const rb = find(parent, b);
  if (ra !== rb) parent[rb] = ra;
}

/**
 * Groups listings that likely describe the same SKU across retailers
 * (title similarity — no shared merchant IDs from the feed).
 */
export function clusterProductsByTitle(products: QuantProduct[]): QuantProduct[][] {
  const n = products.length;
  if (n === 0) return [];
  const parent = Array.from({ length: n }, (_, i) => i);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = combinedTitleSimilarity(products[i]!.title, products[j]!.title);
      if (sim >= MERGE_THRESHOLD) {
        union(parent, i, j);
      }
    }
  }

  const buckets = new Map<number, QuantProduct[]>();
  for (let i = 0; i < n; i++) {
    const r = find(parent, i);
    const arr = buckets.get(r) ?? [];
    arr.push(products[i]!);
    buckets.set(r, arr);
  }

  return [...buckets.values()].map((g) => g);
}

export function canonicalClusterTitle(listings: QuantProduct[]): string {
  if (listings.length === 0) return "";
  const sorted = [...listings].sort((a, b) => a.title.length - b.title.length);
  if (listings.length === 1) return sorted[0]!.title;
  const mid = sorted[Math.floor(sorted.length / 2)]!.title;
  return mid.length <= 120 ? mid : `${mid.slice(0, 117)}…`;
}

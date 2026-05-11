import type { QuantProduct } from "@/lib/shoppingScore";
import { combinedTitleSimilarity } from "./normalizeTitle";
import { extractProductIdentity } from "./productIdentity";
import { identityMatchScore } from "./identityMatchScore";

/** Title-only floor (legacy tray). */
const TITLE_MERGE_MIN = 0.34;
/** Strong identity agreement (models / tokens / folded titles). */
const ID_MERGE_MIN = 0.52;
/** Weak title + moderate identity bridge (cross-language listings). */
const BRIDGE_TITLE = 0.26;
const BRIDGE_ID = 0.38;

function find(parent: number[], i: number): number {
  if (parent[i] !== i) parent[i] = find(parent, parent[i]);
  return parent[i];
}

function union(parent: number[], a: number, b: number): void {
  const ra = find(parent, a);
  const rb = find(parent, b);
  if (ra !== rb) parent[rb] = ra;
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/**
 * Groups listings that likely describe the same SKU across retailers
 * using normalized titles, brand/model/id hints, token overlap, and price sanity.
 */
export function clusterProductsByTitle(products: QuantProduct[]): QuantProduct[][] {
  const n = products.length;
  if (n === 0) return [];
  const parent = Array.from({ length: n }, (_, i) => i);
  const identities = products.map(extractProductIdentity);
  const prices = products.map((p) => p.price).filter((x) => x > 0);
  const peerMed = prices.length ? median(prices) : 0;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const titleSim = combinedTitleSimilarity(products[i]!.title, products[j]!.title);
      const idSim = identityMatchScore(
        identities[i]!,
        identities[j]!,
        products[i]!.price,
        products[j]!.price,
        peerMed
      );
      const merge =
        titleSim >= TITLE_MERGE_MIN ||
        idSim >= ID_MERGE_MIN ||
        (titleSim >= BRIDGE_TITLE && idSim >= BRIDGE_ID);
      if (merge) union(parent, i, j);
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

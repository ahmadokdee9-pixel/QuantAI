/**
 * Equivalence graph — union-find clustering for cross-merchant same-product groups.
 */

import { extractProductIdentity } from "@/lib/deals/productIdentity";
import { identityMatchScore } from "@/lib/deals/identityMatchScore";
import {
  buildProductIdentityConfidence,
  createCanonicalProductIdentity,
  detectCrossRetailIdentity,
} from "@/lib/intelligence/productIdentity";
import type { NormalizedListingRecord } from "./types";
import { buildEquivalenceClassId } from "./canonicalId";

const EQUIVALENCE_MATCH_FLOOR = 0.78;
const IDENTIFIER_MATCH_FLOOR = 0.84;

function find(parent: number[], i: number): number {
  let x = i;
  while (parent[x] !== x) {
    parent[x] = parent[parent[x]!]!;
    x = parent[x]!;
  }
  return x;
}

function union(parent: number[], i: number, j: number): void {
  const ri = find(parent, i);
  const rj = find(parent, j);
  if (ri !== rj) parent[rj] = ri;
}

function medianPrice(records: NormalizedListingRecord[]): number {
  const prices = records.map((r) => r.product.price).filter((n) => n > 0).sort((a, b) => a - b);
  if (!prices.length) return 0;
  return prices[Math.floor(prices.length / 2)] ?? 0;
}

function shareIdentifier(a: NormalizedListingRecord, b: NormalizedListingRecord): boolean {
  if (!a.identifierAnchors.length || !b.identifierAnchors.length) return false;
  const setB = new Set(b.identifierAnchors);
  return a.identifierAnchors.some((x) => setB.has(x));
}

function shouldCluster(a: NormalizedListingRecord, b: NormalizedListingRecord, peerMedian: number): boolean {
  if (a.commerceId === b.commerceId) return true;
  if (shareIdentifier(a, b)) return true;

  const ia = extractProductIdentity(a.product);
  const ib = extractProductIdentity(b.product);

  if (a.variantKey === b.variantKey) {
    const conf = buildProductIdentityConfidence(a.product, b.product, ia, ib, peerMedian);
    return detectCrossRetailIdentity(a.product, b.product, conf);
  }

  const score = identityMatchScore(ia, ib, a.product.price, b.product.price, peerMedian);
  const conf = buildProductIdentityConfidence(a.product, b.product, ia, ib, peerMedian);
  const floor = shareIdentifier(a, b) ? IDENTIFIER_MATCH_FLOOR : EQUIVALENCE_MATCH_FLOOR;
  if (score < floor) return false;
  return detectCrossRetailIdentity(a.product, b.product, Math.max(score, conf));
}

export type EquivalenceCluster = {
  rootIndex: number;
  memberIndices: number[];
  equivalenceClassId: string;
  commerceIds: string[];
};

/** Build union-find equivalence clusters across tray listings. */
export function buildEquivalenceGraph(records: NormalizedListingRecord[]): EquivalenceCluster[] {
  const n = records.length;
  if (n === 0) return [];

  const parent = records.map((_, i) => i);
  const peerMedian = medianPrice(records);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (shouldCluster(records[i]!, records[j]!, peerMedian)) {
        union(parent, i, j);
      }
    }
  }

  const buckets = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(parent, i);
    const list = buckets.get(root) ?? [];
    list.push(i);
    buckets.set(root, list);
  }

  const clusters: EquivalenceCluster[] = [];
  for (const [rootIndex, memberIndices] of buckets) {
    const commerceIds = [...new Set(memberIndices.map((i) => records[i]!.commerceId))].sort();
    clusters.push({
      rootIndex,
      memberIndices,
      equivalenceClassId: buildEquivalenceClassId(commerceIds),
      commerceIds,
    });
  }

  return clusters;
}

/** Variant family groups — collapse variants sharing familyGraphId but different variantKey. */
export function groupByFamilyGraph(records: NormalizedListingRecord[]): Map<string, NormalizedListingRecord[]> {
  const map = new Map<string, NormalizedListingRecord[]>();
  for (const rec of records) {
    const list = map.get(rec.familyGraphId) ?? [];
    list.push(rec);
    map.set(rec.familyGraphId, list);
  }
  return map;
}

export function groupByVariantKey(records: NormalizedListingRecord[]): Map<string, NormalizedListingRecord[]> {
  const map = new Map<string, NormalizedListingRecord[]>();
  for (const rec of records) {
    const list = map.get(rec.variantKey) ?? [];
    list.push(rec);
    map.set(rec.variantKey, list);
  }
  return map;
}

export { createCanonicalProductIdentity };

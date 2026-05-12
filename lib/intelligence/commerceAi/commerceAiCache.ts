import { createHash } from "node:crypto";
import type { ProductCommerceAI } from "@/lib/intelligence/commerceAnalysisTypes";

export type CachedCommerceBatch = {
  byProductId: Map<number, ProductCommerceAI>;
  fieldComparisonSummary: string;
  modelId: string;
};

const TTL_MS = 12 * 60 * 1000;
const MAX_ENTRIES = 180;

const store = new Map<string, { expires: number; value: CachedCommerceBatch }>();

function evictIfNeeded() {
  const now = Date.now();
  for (const [k, v] of [...store.entries()]) {
    if (v.expires <= now) store.delete(k);
  }
  if (store.size <= MAX_ENTRIES) return;
  while (store.size > MAX_ENTRIES) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
    else break;
  }
}

export function commerceAiCacheKey(query: string, productFingerprints: string[]): string {
  const h = createHash("sha256");
  h.update(query.trim().toLowerCase());
  h.update("|");
  h.update(productFingerprints.join("|"));
  return h.digest("hex");
}

export function getCommerceAiCache(key: string): CachedCommerceBatch | null {
  const row = store.get(key);
  if (!row) return null;
  if (row.expires <= Date.now()) {
    store.delete(key);
    return null;
  }
  return row.value;
}

export function setCommerceAiCache(key: string, value: CachedCommerceBatch): void {
  evictIfNeeded();
  store.set(key, { expires: Date.now() + TTL_MS, value });
}

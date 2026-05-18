import type { ShoppingProduct } from "./fetchShopping";
import { fetchShoppingProducts } from "./fetchShopping";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";

/** Coalesce concurrent identical queries (same process) to cut duplicate SerpAPI work. */
const inflight = new Map<string, Promise<{ ok: true; products: ShoppingProduct[] } | { ok: false; error: string; status: number }>>();

export function fetchShoppingProductsDeduped(query: string, canonicalQuery?: CanonicalQueryContract) {
  const marketKey = canonicalQuery?.market.country ?? "default";
  const queryKey = (canonicalQuery?.upstreamQuery || query).trim().toLowerCase();
  if (!queryKey) {
    return Promise.resolve({ ok: false as const, error: "Missing query", status: 400 });
  }
  const k = `${marketKey}:${queryKey}`;
  let p = inflight.get(k);
  if (!p) {
    p = fetchShoppingProducts(query, canonicalQuery).finally(() => {
      inflight.delete(k);
    });
    inflight.set(k, p);
  }
  return p;
}

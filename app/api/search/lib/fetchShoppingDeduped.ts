import type { ShoppingProduct } from "./fetchShopping";
import { fetchShoppingProducts } from "./fetchShopping";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";

/** Coalesce concurrent identical queries (same process) to cut duplicate SerpAPI work. */
const inflight = new Map<string, Promise<{ ok: true; products: ShoppingProduct[] } | { ok: false; error: string; status: number }>>();

export function fetchShoppingProductsDeduped(query: string, canonicalQuery?: CanonicalQueryContract) {
  const k = (canonicalQuery?.upstreamQuery || query).trim().toLowerCase();
  if (!k) {
    return Promise.resolve({ ok: false as const, error: "Missing query", status: 400 });
  }
  let p = inflight.get(k);
  if (!p) {
    p = fetchShoppingProducts(query, canonicalQuery).finally(() => {
      inflight.delete(k);
    });
    inflight.set(k, p);
  }
  return p;
}

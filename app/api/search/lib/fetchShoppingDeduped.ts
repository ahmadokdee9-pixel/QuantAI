import type { ShoppingProduct } from "./fetchShopping";
import { fetchShoppingProducts } from "./fetchShopping";

/** Coalesce concurrent identical queries (same process) to cut duplicate SerpAPI work. */
const inflight = new Map<string, Promise<{ ok: true; products: ShoppingProduct[] } | { ok: false; error: string; status: number }>>();

export function fetchShoppingProductsDeduped(query: string) {
  const k = query.trim().toLowerCase();
  if (!k) {
    return Promise.resolve({ ok: false as const, error: "Missing query", status: 400 });
  }
  let p = inflight.get(k);
  if (!p) {
    p = fetchShoppingProducts(query).finally(() => {
      inflight.delete(k);
    });
    inflight.set(k, p);
  }
  return p;
}

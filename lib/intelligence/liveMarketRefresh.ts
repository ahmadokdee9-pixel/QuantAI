/**
 * QuantAI Live Commerce Discovery — bounded external market refresh.
 * Uses existing Shopping upstream when available; never blocks forever.
 */

import { fetchShoppingProducts } from "@/app/api/search/lib/fetchShopping";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import { buildExternalExpansionQueries, type ExternalMerchantCandidate } from "./externalMerchantSearch";

export type LiveMarketRefreshResult = {
  products: QuantProduct[];
  attemptedQueries: string[];
  timedOut: boolean;
  source: "serpapi" | "disabled" | "disabled_missing_key" | "empty";
};

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const id = setTimeout(() => resolve(fallback), ms);
    promise
      .then((v) => resolve(v))
      .catch(() => resolve(fallback))
      .finally(() => clearTimeout(id));
  });
}

export async function refreshLiveMarketProducts(
  query: string,
  candidates: ExternalMerchantCandidate[],
  canonicalQuery?: CanonicalQueryContract
): Promise<LiveMarketRefreshResult> {
  if (process.env.QUANTAI_LIVE_DISCOVERY === "off") {
    return { products: [], attemptedQueries: [], timedOut: false, source: "disabled" };
  }
  if (!process.env.SERPAPI_KEY) {
    return { products: [], attemptedQueries: [], timedOut: false, source: "disabled_missing_key" };
  }

  const attemptedQueries = buildExternalExpansionQueries(query, candidates, canonicalQuery).slice(0, 4);
  if (!attemptedQueries.length) return { products: [], attemptedQueries, timedOut: false, source: "empty" };

  const timeoutMs = Math.min(12_000, Math.max(3_000, Number(process.env.QUANTAI_LIVE_DISCOVERY_TIMEOUT_MS) || 8_000));
  const fallback = { ok: false as const, error: "Live discovery timed out", status: 504 };
  const results = await Promise.all(
    attemptedQueries.map((q) => withTimeout(fetchShoppingProducts(q), timeoutMs, fallback))
  );
  const products = results.flatMap((r) => (r.ok ? r.products : []));
  return {
    products: products.map((p) => ({
      ...p,
      extensions: [...(Array.isArray(p.extensions) ? p.extensions : []), "Live market refresh"].slice(0, 6),
    })),
    attemptedQueries,
    timedOut: results.some((r) => !r.ok && r.status === 504),
    source: "serpapi",
  };
}

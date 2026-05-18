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
  successfulQueries: number;
  failedQueries: number;
  retriesAttempted: number;
  fallbackQueriesAttempted: number;
  partialRecovery: boolean;
  recoveredFromFallback: boolean;
  upstreamReliabilityScore: number;
  upstreamFailures: { query: string; status: number; error: string; attempt: number }[];
};

export type LiveMarketRefreshOptions = {
  maxAttemptedQueries?: number;
  timeoutMs?: number;
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

function emptyResult(source: LiveMarketRefreshResult["source"]): LiveMarketRefreshResult {
  return {
    products: [],
    attemptedQueries: [],
    timedOut: false,
    source,
    successfulQueries: 0,
    failedQueries: 0,
    retriesAttempted: 0,
    fallbackQueriesAttempted: 0,
    partialRecovery: false,
    recoveredFromFallback: false,
    upstreamReliabilityScore: source === "disabled" || source === "disabled_missing_key" ? 0 : 100,
    upstreamFailures: [],
  };
}

function uniqQueries(queries: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const query of queries) {
    const q = query.replace(/\s+/g, " ").trim();
    const key = q.toLowerCase();
    if (!q || seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

function fallbackQueries(query: string, candidates: ExternalMerchantCandidate[], canonicalQuery?: CanonicalQueryContract): string[] {
  const identity = [
    canonicalQuery?.brand,
    canonicalQuery?.model,
    canonicalQuery?.variant,
    canonicalQuery?.productType !== "unknown" ? canonicalQuery?.productType : "",
  ].filter(Boolean).join(" ");
  const trustedMerchants = candidates
    .filter((candidate) => (candidate.routeQuality ?? candidate.priority) >= 78)
    .slice(0, 3)
    .map((candidate) => candidate.label.replace(/\.com$/i, ""))
    .join(" ");
  return uniqQueries([
    identity,
    `${identity || query} ${trustedMerchants}`,
    canonicalQuery?.upstreamQuery ?? "",
    query,
  ]).slice(0, 3);
}

async function fetchWithRecovery(
  query: string,
  timeoutMs: number,
  maxRetries: number
): Promise<{
  products: QuantProduct[];
  ok: boolean;
  timedOut: boolean;
  retriesAttempted: number;
  failures: { query: string; status: number; error: string; attempt: number }[];
}> {
  const failures: { query: string; status: number; error: string; attempt: number }[] = [];
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const fallback = { ok: false as const, error: "Live discovery timed out", status: 504 };
    const result = await withTimeout(fetchShoppingProducts(query), timeoutMs, fallback);
    if (result.ok) return { products: result.products, ok: true, timedOut: false, retriesAttempted: attempt, failures };
    failures.push({ query, status: result.status, error: result.error, attempt: attempt + 1 });
    if (![429, 500, 502, 503, 504].includes(result.status)) break;
  }
  return {
    products: [],
    ok: false,
    timedOut: failures.some((failure) => failure.status === 504),
    retriesAttempted: Math.max(0, failures.length - 1),
    failures,
  };
}

export async function refreshLiveMarketProducts(
  query: string,
  candidates: ExternalMerchantCandidate[],
  canonicalQuery?: CanonicalQueryContract,
  options: LiveMarketRefreshOptions = {}
): Promise<LiveMarketRefreshResult> {
  if (process.env.QUANTAI_LIVE_DISCOVERY === "off") {
    return emptyResult("disabled");
  }
  if (!process.env.SERPAPI_KEY) {
    return emptyResult("disabled_missing_key");
  }

  const maxAttemptedQueries = Math.min(4, Math.max(1, Math.round(options.maxAttemptedQueries ?? 2)));
  const primaryQueries = buildExternalExpansionQueries(query, candidates, canonicalQuery).slice(0, maxAttemptedQueries);
  if (!primaryQueries.length) return emptyResult("empty");

  const envTimeout = Number(process.env.DISCOVERY_TIMEOUT_MS || process.env.QUANTAI_LIVE_DISCOVERY_TIMEOUT_MS);
  const timeoutMs = Math.min(9_000, Math.max(2_500, Math.round((options.timeoutMs ?? envTimeout) || 6_000)));
  const maxRetries = Math.min(2, Math.max(0, Number(process.env.DISCOVERY_RETRY_COUNT) || 1));
  const fallbackChain = fallbackQueries(query, candidates, canonicalQuery);
  const attemptedQueries: string[] = [];
  const failures: LiveMarketRefreshResult["upstreamFailures"] = [];
  let retriesAttempted = 0;
  let fallbackQueriesAttempted = 0;
  let successfulQueries = 0;
  let failedQueries = 0;
  let timedOut = false;
  let recoveredFromFallback = false;
  const products: QuantProduct[] = [];

  for (const primary of primaryQueries) {
    attemptedQueries.push(primary);
    const primaryResult = await fetchWithRecovery(primary, timeoutMs, maxRetries);
    retriesAttempted += primaryResult.retriesAttempted;
    failures.push(...primaryResult.failures);
    timedOut ||= primaryResult.timedOut;
    if (primaryResult.ok) {
      successfulQueries += 1;
      products.push(...primaryResult.products);
      continue;
    }

    let recovered = false;
    for (const fallbackQuery of fallbackChain) {
      if (fallbackQuery.toLowerCase() === primary.toLowerCase()) continue;
      attemptedQueries.push(fallbackQuery);
      fallbackQueriesAttempted += 1;
      const fallbackResult = await fetchWithRecovery(fallbackQuery, Math.max(2_500, Math.round(timeoutMs * 0.72)), 0);
      failures.push(...fallbackResult.failures);
      timedOut ||= fallbackResult.timedOut;
      if (fallbackResult.ok) {
        successfulQueries += 1;
        products.push(...fallbackResult.products);
        recovered = true;
        recoveredFromFallback = true;
        break;
      }
    }
    if (!recovered) failedQueries += 1;
  }

  const totalAttempts = successfulQueries + failedQueries + fallbackQueriesAttempted + retriesAttempted;
  const upstreamReliabilityScore = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        (successfulQueries / Math.max(1, successfulQueries + failedQueries)) * 72 +
          (recoveredFromFallback ? 12 : 0) -
          (timedOut ? 18 : 0) -
          Math.min(18, failures.length * 3) -
          Math.min(8, Math.max(0, totalAttempts - 2))
      )
    )
  );
  return {
    products: products.map((p) => ({
      ...p,
      extensions: [...(Array.isArray(p.extensions) ? p.extensions : []), "Live market refresh"].slice(0, 6),
    })),
    attemptedQueries,
    timedOut,
    source: "serpapi",
    successfulQueries,
    failedQueries,
    retriesAttempted,
    fallbackQueriesAttempted,
    partialRecovery: successfulQueries > 0 && failedQueries > 0,
    recoveredFromFallback,
    upstreamReliabilityScore,
    upstreamFailures: failures.slice(0, 6),
  };
}

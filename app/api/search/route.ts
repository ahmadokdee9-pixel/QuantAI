import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { enrichProductsWithIntelligence } from "@/lib/intelligence/enrichProducts";
import type { SearchCommerceAIMeta } from "@/lib/intelligence/commerceAnalysisTypes";
import { attachCommerceAiLayer } from "@/lib/intelligence/commerceAi/attachCommerceAiLayer";
import { resolveCommerceAiEngine } from "@/lib/intelligence/commerceAi/commerceAiEngine";
import { mergeCommerceSessionMemory, safeParseCommerceSessionMemory } from "@/lib/intelligence/commerceSessionMemory";
import { buildBundleSuggestions } from "@/lib/intelligence/bundleIntelligence";
import { applyMarketAwarenessRanking, computeMarketAwarenessForTray } from "@/lib/intelligence/marketAwareness";
import { applyPersonaRanking } from "@/lib/intelligence/personaRanking";
import { applyPredictiveCommerceToTray } from "@/lib/intelligence/predictiveCommerceIntelligence";
import { detectShopperPersonas } from "@/lib/intelligence/shopperPersona";
import {
  countSearchesTodayUtc,
  mergeRecommendationMemory,
  memoryPatchFromSearch,
  recordSearchHistory,
} from "@/lib/intelligence/persistence";
import { buildDealClusters } from "@/lib/deals";
import { buildSearchIntelligence } from "@/lib/intelligence/searchDecisionEngine";
import { runLiveCommerceDiscovery, type LiveCommerceDiscoveryMeta } from "@/lib/intelligence/liveCommerceDiscovery";
import { applyHardIdentityGate, buildIdentityDebugSummary, recoverSafeIdentityBreadth } from "@/lib/intelligence/productIdentity";
import { intentMatchEnvelope } from "@/lib/intelligence/searchIntentV2";
import { enforceLimit, searchRatelimit } from "@/lib/rate-limit";
import { entitlementsForTier } from "@/lib/subscription/entitlements";
import { planDefinition } from "@/lib/subscription/plans";
import { subscriptionTierFromClerkUser } from "@/lib/subscription/resolveTier";
import { buildUniversalCommerceContext, tasteTagListForApi } from "@/lib/commerce-os";
import { buildCanonicalQuery, canonicalQueryForDebug, type CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import { normalizeSearchCacheKey } from "@/lib/search/searchCacheKey";
import { semanticRerankSearchResults } from "@/lib/search/semanticReranker";
import type { DealClusterDTO } from "@/lib/deals/types";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { SearchEntitlementsDTO } from "@/lib/subscription/entitlements";
import type { QuantProduct } from "@/lib/shoppingScore";
import { fetchShoppingProductsDeduped } from "./lib/fetchShoppingDeduped";
import { fetchShoppingProducts } from "./lib/fetchShopping";

const SEARCH_UPSTREAM_PREFIX = "__SEARCH_UPSTREAM__:";

function fallbackLiveDiscoveryMeta(
  products: QuantProduct[],
  status: LiveCommerceDiscoveryMeta["status"],
  error?: unknown
): LiveCommerceDiscoveryMeta {
  return {
    version: 1,
    status,
    discoveryEnabled: false,
    discoveryMode: "disabled",
    discoveryStatus: status,
    discoveryCandidates: 0,
    candidateCount: 0,
    candidateMerchants: [],
    attemptedQueries: [],
    externalRows: 0,
    externalRowsAccepted: 0,
    validatedExternalRows: 0,
    validatedMerchantCount: 0,
    rejectedDiscoveryRows: 0,
    fusedRows: products.length,
    timedOut: false,
    timeoutTriggered: false,
    source: status === "disabled_missing_key" ? "disabled_missing_key" : "disabled",
    unknownCategoryMode: false,
    identityGatePassed: 0,
    exactMatchPassed: 0,
    discoveryLatency: 0,
    fusionConfidence: 0,
    maxDiscoveryRows: 0,
    maxDiscoveryMerchants: 0,
    timeoutMs: 0,
    discoveryHealthScore: 0,
    upstreamReliabilityScore: 0,
    successfulQueries: 0,
    failedQueries: 0,
    retriesAttempted: 0,
    fallbackQueriesAttempted: 0,
    partialRecovery: false,
    recoveredFromFallback: false,
    upstreamFailures: [],
    merchantReliability: [],
    ...(error
      ? { error: error instanceof Error ? error.message : "Live discovery failed." }
      : {}),
  };
}

async function runSafeLiveCommerceDiscovery(
  query: string,
  internalProducts: QuantProduct[],
  canonicalQuery?: CanonicalQueryContract
) {
  try {
    return await runLiveCommerceDiscovery(query, internalProducts, canonicalQuery);
  } catch (error) {
    console.error("[QuantAI:live-discovery] Falling back to internal results", error);
    return {
      products: internalProducts,
      candidates: [],
      meta: fallbackLiveDiscoveryMeta(internalProducts, "failed", error),
    };
  }
}

async function runSearchPipeline(query: string): Promise<{
  products: QuantProduct[];
  dealClusters: DealClusterDTO[];
  searchIntelligence: SearchIntelligenceDTO | null;
  commerceMeta: SearchCommerceAIMeta;
  liveDiscovery: LiveCommerceDiscoveryMeta;
  canonicalQuery: CanonicalQueryContract;
}> {
  const canonicalQuery = buildCanonicalQuery(query);
  const result = await fetchShoppingProductsWithFallback(query, canonicalQuery);
  if (!result.ok) {
    const status =
      result.status >= 400 && result.status < 600 ? result.status : 502;
    throw new Error(
      `${SEARCH_UPSTREAM_PREFIX}${status}:${result.error || "Search upstream failed."}`
    );
  }
  const liveDiscovery = await runSafeLiveCommerceDiscovery(query, result.products, canonicalQuery);
  let products = enrichProductsWithIntelligence(liveDiscovery.products, query, canonicalQuery);
  if (products.length === 0 && liveDiscovery.products.length > 0) {
    products = liveDiscovery.products.slice(0, 24).map((p, i) => ({ ...p, qiRank: i }));
  }
  const layered = await attachCommerceAiLayer(products, query);
  products = layered.products;
  const dealClusters = buildDealClusters(products);
  const searchIntelligence = buildSearchIntelligence(query, products, dealClusters);
  return {
    products,
    dealClusters,
    searchIntelligence,
    commerceMeta: layered.commerceMeta,
    liveDiscovery: liveDiscovery.meta,
    canonicalQuery,
  };
}

async function fetchShoppingProductsWithFallback(
  query: string,
  canonicalQuery: CanonicalQueryContract
) {
  const primary = await fetchShoppingProductsDeduped(query, canonicalQuery);
  if (primary.ok) return primary;

  const fallbackQueries = [
    [canonicalQuery.brand, canonicalQuery.model, canonicalQuery.variant, canonicalQuery.productType !== "unknown" ? canonicalQuery.productType : ""]
      .filter(Boolean)
      .join(" "),
    canonicalQuery.upstreamQuery,
    canonicalQuery.normalizedQuery,
    query,
  ];
  const seen = new Set<string>();
  for (const fallbackQuery of fallbackQueries) {
    const q = fallbackQuery.replace(/\s+/g, " ").trim();
    const key = q.toLowerCase();
    if (!q || seen.has(key) || key === canonicalQuery.upstreamQuery.toLowerCase()) continue;
    seen.add(key);
    const recovered = await fetchShoppingProducts(q);
    if (recovered.ok) return recovered;
  }
  return primary;
}

/** Cross-request tray cache — normalized key improves hit rate; short TTL keeps prices fresh. */
const getCachedSearchPipeline = unstable_cache(
  async (pipelineQuery: string) => runSearchPipeline(pipelineQuery),
  ["quantai-search-pipeline-v26-category-family-breadth"],
  { revalidate: 120 }
);

type SearchDataPayload = {
  products: QuantProduct[];
  dealClusters: DealClusterDTO[];
  meta: Record<string, unknown>;
  searchIntelligence: SearchIntelligenceDTO | null;
  entitlements?: SearchEntitlementsDTO;
};

type StageSuppressionTrace = {
  stage: string;
  before: number;
  after: number;
  suppressed: number;
};

function sourceCount(products: QuantProduct[]): number {
  return new Set(products.map((p) => p.store.trim().toLowerCase()).filter(Boolean)).size;
}

function searchDebugMeta(args: {
  products: QuantProduct[];
  liveDiscovery?: LiveCommerceDiscoveryMeta | null;
  canonicalQuery?: CanonicalQueryContract | null;
  fallbackReason?: string | null;
  errorState?: string | null;
  stageSuppression?: StageSuppressionTrace[];
}): Record<string, unknown> {
  const { products, liveDiscovery = null, canonicalQuery = null, fallbackReason = null, errorState = null, stageSuppression = [] } = args;
  const identityDebug = canonicalQuery ? buildIdentityDebugSummary(products, canonicalQuery) : null;
  return {
    productCount: products.length,
    productsCount: products.length,
    sourceCount: sourceCount(products),
    fallbackReason,
    errorState,
    liveDiscoveryStatus: liveDiscovery?.status ?? null,
    liveDiscoverySource: liveDiscovery?.source ?? null,
    discoveryEnabled: liveDiscovery?.discoveryEnabled ?? false,
    discoveryMode: liveDiscovery?.discoveryMode ?? "disabled",
    discoveryStatus: liveDiscovery?.discoveryStatus ?? liveDiscovery?.status ?? null,
    discoveryCandidates: liveDiscovery?.discoveryCandidates ?? liveDiscovery?.candidateCount ?? 0,
    validatedMerchantCount: liveDiscovery?.validatedMerchantCount ?? 0,
    rejectedDiscoveryRows: liveDiscovery?.rejectedDiscoveryRows ?? 0,
    timeoutTriggered: liveDiscovery?.timeoutTriggered ?? liveDiscovery?.timedOut ?? false,
    externalRowsAccepted: liveDiscovery?.externalRowsAccepted ?? liveDiscovery?.validatedExternalRows ?? 0,
    unknownCategoryMode: liveDiscovery?.unknownCategoryMode ?? false,
    identityGatePassed: liveDiscovery?.identityGatePassed ?? 0,
    exactMatchPassed: liveDiscovery?.exactMatchPassed ?? 0,
    discoveryLatency: liveDiscovery?.discoveryLatency ?? 0,
    fusionConfidence: liveDiscovery?.fusionConfidence ?? 0,
    discoveryHealthScore: liveDiscovery?.discoveryHealthScore ?? 0,
    upstreamReliabilityScore: liveDiscovery?.upstreamReliabilityScore ?? 0,
    successfulQueries: liveDiscovery?.successfulQueries ?? 0,
    failedQueries: liveDiscovery?.failedQueries ?? 0,
    retriesAttempted: liveDiscovery?.retriesAttempted ?? 0,
    fallbackQueriesAttempted: liveDiscovery?.fallbackQueriesAttempted ?? 0,
    partialRecovery: liveDiscovery?.partialRecovery ?? false,
    recoveredFromFallback: liveDiscovery?.recoveredFromFallback ?? false,
    upstreamFailures: liveDiscovery?.upstreamFailures ?? [],
    merchantReliability: liveDiscovery?.merchantReliability ?? [],
    discoveryValidationTrace: liveDiscovery?.discoveryValidationTrace ?? null,
    stageSuppression,
    canonicalQuery: canonicalQuery ? canonicalQueryForDebug(canonicalQuery) : null,
    identityDebug,
  };
}

function emptySearchData(meta?: Record<string, unknown>): Pick<SearchDataPayload, "products" | "dealClusters" | "meta"> {
  return { products: [], dealClusters: [], meta: meta ?? searchDebugMeta({ products: [], errorState: null }) };
}

function jsonSearch(
  body: Record<string, unknown>,
  init?: ResponseInit
): NextResponse {
  return NextResponse.json(body, { status: 200, ...init });
}

type SearchHandleOptions = {
  commerceMemory?: unknown;
};

async function optionalClerkSearchUser(): Promise<{
  userId: string | null;
  user: { publicMetadata?: Record<string, unknown> } | null;
}> {
  return { userId: null, user: null };
}

async function handleSearch(
  q: string | null | undefined,
  opts?: SearchHandleOptions
): Promise<NextResponse> {
  const fail = (
    status: number,
    error: string,
    message: string,
    extras?: Record<string, unknown>
  ) =>
    jsonSearch(
      {
        success: false,
        error,
        message,
        data: emptySearchData(
          searchDebugMeta({
            products: [],
            fallbackReason: error,
            errorState: error,
          })
        ),
        ...extras,
      },
      { status }
    );

  try {
    const query = q?.trim();
    if (!query) {
      return fail(400, "BAD_REQUEST", "Missing query");
    }
    const requestCanonicalQuery = buildCanonicalQuery(query);

    const { userId, user } = await optionalClerkSearchUser();
    const tier = subscriptionTierFromClerkUser(user);
    const plan = planDefinition(tier);

    if (userId) {
      const usedToday = await countSearchesTodayUtc(userId);
      if (usedToday !== null && usedToday >= plan.searchesPerDay) {
        return fail(
          429,
          "RATE_LIMIT",
          `Daily search limit reached (${plan.searchesPerDay}) for your plan. Upgrade for more.`,
          {
            code: "PLAN_SEARCH_LIMIT",
            entitlements: entitlementsForTier(tier),
          }
        );
      }

      const limited = await enforceLimit(searchRatelimit, userId);
      if (!limited.ok) {
        return jsonSearch(
          {
            success: false,
            error: "RATE_LIMIT",
            message: "Too many searches. Try again later.",
            data: emptySearchData(),
            retryAfter: limited.retryAfter,
          },
          {
            status: 429,
            headers: { "Retry-After": String(limited.retryAfter) },
          }
        );
      }
    }

    const pipelineKey = normalizeSearchCacheKey(requestCanonicalQuery.normalizedQuery || query);

    let products: QuantProduct[];
    let dealClusters: DealClusterDTO[];
    let searchIntelligence: SearchIntelligenceDTO | null;
    let commerceMeta: SearchCommerceAIMeta;
    let liveDiscovery: LiveCommerceDiscoveryMeta;
    const canonicalQuery: CanonicalQueryContract = requestCanonicalQuery;
    const stageSuppression: StageSuppressionTrace[] = [];
    const traceStage = (stage: string, before: number, after: number) => {
      stageSuppression.push({
        stage,
        before,
        after,
        suppressed: Math.max(0, before - after),
      });
    };
    try {
      const tray = await getCachedSearchPipeline(pipelineKey);
      products = tray.products;
      dealClusters = tray.dealClusters;
      searchIntelligence = tray.searchIntelligence;
      commerceMeta = tray.commerceMeta;
      liveDiscovery = tray.liveDiscovery;
      traceStage("pipeline_enrichment_and_ai", liveDiscovery.fusedRows, products.length);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.startsWith(SEARCH_UPSTREAM_PREFIX)) {
        const rest = msg.slice(SEARCH_UPSTREAM_PREFIX.length);
        const colon = rest.indexOf(":");
        const statusRaw = colon >= 0 ? rest.slice(0, colon) : rest;
        const status = Number.parseInt(statusRaw, 10);
        const message = colon >= 0 ? rest.slice(colon + 1) : "Search upstream failed.";
        const httpStatus = Number.isFinite(status) && status >= 400 && status < 600 ? status : 502;
        return fail(httpStatus, "SEARCH_FAILED", message || "Search upstream failed.", {
          data: emptySearchData(
            searchDebugMeta({
              products: [],
              canonicalQuery: requestCanonicalQuery,
              fallbackReason: "SEARCH_FAILED",
              errorState: "SEARCH_FAILED",
            })
          ),
        });
      }
      return fail(
        500,
        "SEARCH_FAILED",
        e instanceof Error ? e.message : "Search could not complete.",
        {
          data: emptySearchData(
            searchDebugMeta({
              products: [],
              canonicalQuery: requestCanonicalQuery,
              fallbackReason: "SEARCH_FAILED",
              errorState: "SEARCH_FAILED",
            })
          ),
        }
      );
    }

    const intents = canonicalQuery.commerceIntents;
    let stageBefore = products.length;
    products = applyPredictiveCommerceToTray(products, query, intents);
    traceStage("predictive_ranking", stageBefore, products.length);
    const shopperPersona = detectShopperPersonas(query, intents);
    const prevCommerceMemory = safeParseCommerceSessionMemory(opts?.commerceMemory);
    const tasteTagIds = tasteTagListForApi(intents.taste);
    const commerceSessionMemory = mergeCommerceSessionMemory(
      prevCommerceMemory,
      query,
      products.slice(0, 20),
      shopperPersona,
      tasteTagIds
    );
    stageBefore = products.length;
    products = applyPersonaRanking(products, shopperPersona, commerceSessionMemory);
    traceStage("persona_ranking", stageBefore, products.length);
    stageBefore = products.length;
    products = applyMarketAwarenessRanking(products, query);
    traceStage("market_awareness_ranking", stageBefore, products.length);
    const preIdentityGateProducts = products;
    products = applyHardIdentityGate(products, canonicalQuery);
    traceStage("hard_identity_gate", preIdentityGateProducts.length, products.length);
    if (products.length === 0 && preIdentityGateProducts.length > 0) {
      products = recoverSafeIdentityBreadth(preIdentityGateProducts, canonicalQuery);
      traceStage("safe_identity_breadth_recovery", 0, products.length);
    }
    const preSemanticProducts = products;
    products = semanticRerankSearchResults(products, query, canonicalQuery);
    traceStage("semantic_rerank", preSemanticProducts.length, products.length);
    if (products.length === 0 && preSemanticProducts.length > 0) {
      products = preSemanticProducts.map((p, i) => ({ ...p, qiRank: i }));
      traceStage("semantic_empty_guard", 0, products.length);
    }
    dealClusters = buildDealClusters(products);
    searchIntelligence = buildSearchIntelligence(query, products, dealClusters);
    const bundleSuggestions = buildBundleSuggestions(products.slice(0, 36), query, shopperPersona);

    const { topCategory } = memoryPatchFromSearch(query);

    if (userId) {
      void recordSearchHistory(userId, query, products.length);
      void mergeRecommendationMemory(userId, query, topCategory, shopperPersona.labels);
    }

    const marketAwareness = computeMarketAwarenessForTray(query, products);
    const fallbackReason =
      liveDiscovery.status === "enabled" ? null : liveDiscovery.error || liveDiscovery.status;
    const debugMeta = searchDebugMeta({
      products,
      liveDiscovery,
      canonicalQuery,
      fallbackReason,
      errorState: null,
      stageSuppression,
    });

    const data: SearchDataPayload = {
      products,
      dealClusters,
      searchIntelligence,
      entitlements: entitlementsForTier(tier),
      meta: {
        category: topCategory,
        intelligenceVersion: 13,
        predictiveCommerceVersion: 2,
        marketAwareness,
        commerceAI: commerceMeta,
        commerceAiEngine: resolveCommerceAiEngine(),
        universalCommerce: buildUniversalCommerceContext(query, intentMatchEnvelope(query)),
        canonicalQuery: canonicalQueryForDebug(canonicalQuery),
        identityDebug: debugMeta.identityDebug,
        liveDiscovery,
        liveDiscoveryStatus: liveDiscovery.status,
        discoveryEnabled: debugMeta.discoveryEnabled,
        discoveryMode: debugMeta.discoveryMode,
        discoveryStatus: debugMeta.discoveryStatus,
        discoveryCandidates: debugMeta.discoveryCandidates,
        validatedMerchantCount: debugMeta.validatedMerchantCount,
        rejectedDiscoveryRows: debugMeta.rejectedDiscoveryRows,
        timeoutTriggered: debugMeta.timeoutTriggered,
        externalRowsAccepted: debugMeta.externalRowsAccepted,
        unknownCategoryMode: debugMeta.unknownCategoryMode,
        identityGatePassed: debugMeta.identityGatePassed,
        exactMatchPassed: debugMeta.exactMatchPassed,
        discoveryLatency: debugMeta.discoveryLatency,
        fusionConfidence: debugMeta.fusionConfidence,
        discoveryHealthScore: debugMeta.discoveryHealthScore,
        upstreamReliabilityScore: debugMeta.upstreamReliabilityScore,
        successfulQueries: debugMeta.successfulQueries,
        failedQueries: debugMeta.failedQueries,
        retriesAttempted: debugMeta.retriesAttempted,
        fallbackQueriesAttempted: debugMeta.fallbackQueriesAttempted,
        partialRecovery: debugMeta.partialRecovery,
        recoveredFromFallback: debugMeta.recoveredFromFallback,
        upstreamFailures: debugMeta.upstreamFailures,
        merchantReliability: debugMeta.merchantReliability,
        discoveryValidationTrace: debugMeta.discoveryValidationTrace,
        stageSuppression: debugMeta.stageSuppression,
        searchDebug: debugMeta,
        productCount: debugMeta.productCount,
        productsCount: debugMeta.productsCount,
        sourceCount: debugMeta.sourceCount,
        fallbackReason: debugMeta.fallbackReason,
        errorState: debugMeta.errorState,
        commerceSessionMemory,
        shopperPersona: {
          dominant: shopperPersona.dominant,
          labels: shopperPersona.labels,
          scores: shopperPersona.scores,
        },
        shopperPersonaSummary: `${shopperPersona.labels.join(" · ")} · session memory v${commerceSessionMemory.version} · interactions ${commerceSessionMemory.interactionCount}`,
        bundleSuggestions,
      },
    };

    return jsonSearch(
      { success: true, data },
      {
        headers: {
          "Cache-Control": "private, s-maxage=90, stale-while-revalidate=180",
          Vary: "Cookie",
        },
      }
    );
  } catch (e) {
    return fail(
      500,
      "SEARCH_FAILED",
      e instanceof Error ? e.message : "Search could not complete."
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    return await handleSearch(q);
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: "SEARCH_FAILED",
        message: e instanceof Error ? e.message : "Search could not complete.",
        data: emptySearchData(
          searchDebugMeta({
            products: [],
            fallbackReason: "GET_FATAL",
            errorState: "SEARCH_FAILED",
          })
        ),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    let q: string | null = null;
    let commerceMemory: unknown;
    try {
      const body = (await req.json()) as { query?: string; q?: string; commerceMemory?: unknown };
      q = body.query ?? body.q ?? null;
      commerceMemory = body.commerceMemory;
    } catch {
      return NextResponse.json(
        {
          success: false,
          ok: false,
          error: "BAD_REQUEST",
          message: "Invalid JSON body",
          data: emptySearchData(
            searchDebugMeta({
              products: [],
              fallbackReason: "BAD_REQUEST",
              errorState: "BAD_REQUEST",
            })
          ),
          products: [],
          results: [],
        },
        { status: 200 }
      );
    }
    return await handleSearch(q, { commerceMemory });
  } catch (error) {
    console.error("[api/search] fatal", error);
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: "search_failed",
        message: error instanceof Error ? error.message : "Unknown search error",
        data: emptySearchData(
          searchDebugMeta({
            products: [],
            fallbackReason: "POST_FATAL",
            errorState: "search_failed",
          })
        ),
        products: [],
        results: [],
      },
      { status: 200 }
    );
  }
}

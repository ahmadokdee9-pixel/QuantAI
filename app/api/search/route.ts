import { auth, currentUser } from "@clerk/nextjs/server";
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
import { intentMatchEnvelope, parseCommerceSearchIntents } from "@/lib/intelligence/searchIntentV2";
import { enforceLimit, searchRatelimit } from "@/lib/rate-limit";
import { entitlementsForTier } from "@/lib/subscription/entitlements";
import { planDefinition } from "@/lib/subscription/plans";
import { subscriptionTierFromClerkUser } from "@/lib/subscription/resolveTier";
import { buildUniversalCommerceContext, tasteTagListForApi } from "@/lib/commerce-os";
import { normalizeSearchCacheKey } from "@/lib/search/searchCacheKey";
import type { DealClusterDTO } from "@/lib/deals/types";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { SearchEntitlementsDTO } from "@/lib/subscription/entitlements";
import type { QuantProduct } from "@/lib/shoppingScore";
import { fetchShoppingProductsDeduped } from "./lib/fetchShoppingDeduped";

const SEARCH_UPSTREAM_PREFIX = "__SEARCH_UPSTREAM__:";

async function runSearchPipeline(query: string): Promise<{
  products: QuantProduct[];
  dealClusters: DealClusterDTO[];
  searchIntelligence: SearchIntelligenceDTO | null;
  commerceMeta: SearchCommerceAIMeta;
}> {
  const result = await fetchShoppingProductsDeduped(query);
  if (!result.ok) {
    const status =
      result.status >= 400 && result.status < 600 ? result.status : 502;
    throw new Error(
      `${SEARCH_UPSTREAM_PREFIX}${status}:${result.error || "Search upstream failed."}`
    );
  }
  let products = enrichProductsWithIntelligence(result.products, query);
  const layered = await attachCommerceAiLayer(products, query);
  products = layered.products;
  const dealClusters = buildDealClusters(products);
  const searchIntelligence = buildSearchIntelligence(query, products, dealClusters);
  return {
    products,
    dealClusters,
    searchIntelligence,
    commerceMeta: layered.commerceMeta,
  };
}

/** Cross-request tray cache — normalized key improves hit rate; short TTL keeps prices fresh. */
const getCachedSearchPipeline = unstable_cache(
  async (pipelineQuery: string) => runSearchPipeline(pipelineQuery),
  ["quantai-search-pipeline-v4"],
  { revalidate: 120 }
);

type SearchDataPayload = {
  products: QuantProduct[];
  dealClusters: DealClusterDTO[];
  meta: Record<string, unknown>;
  searchIntelligence: SearchIntelligenceDTO | null;
  entitlements?: SearchEntitlementsDTO;
};

function emptySearchData(): Pick<SearchDataPayload, "products" | "dealClusters" | "meta"> {
  return { products: [], dealClusters: [], meta: {} };
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
        data: emptySearchData(),
        ...extras,
      },
      { status }
    );

  try {
    const query = q?.trim();
    if (!query) {
      return fail(400, "BAD_REQUEST", "Missing query");
    }

    const { userId } = await auth();
    const user = userId ? await currentUser() : null;
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

    const pipelineKey = normalizeSearchCacheKey(query);

    let products: QuantProduct[];
    let dealClusters: DealClusterDTO[];
    let searchIntelligence: SearchIntelligenceDTO | null;
    let commerceMeta: SearchCommerceAIMeta;
    try {
      const tray = await getCachedSearchPipeline(pipelineKey);
      products = tray.products;
      dealClusters = tray.dealClusters;
      searchIntelligence = tray.searchIntelligence;
      commerceMeta = tray.commerceMeta;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.startsWith(SEARCH_UPSTREAM_PREFIX)) {
        const rest = msg.slice(SEARCH_UPSTREAM_PREFIX.length);
        const colon = rest.indexOf(":");
        const statusRaw = colon >= 0 ? rest.slice(0, colon) : rest;
        const status = Number.parseInt(statusRaw, 10);
        const message = colon >= 0 ? rest.slice(colon + 1) : "Search upstream failed.";
        const httpStatus = Number.isFinite(status) && status >= 400 && status < 600 ? status : 502;
        return fail(httpStatus, "SEARCH_FAILED", message || "Search upstream failed.");
      }
      return fail(
        500,
        "SEARCH_FAILED",
        e instanceof Error ? e.message : "Search could not complete."
      );
    }

    const intents = parseCommerceSearchIntents(query);
    products = applyPredictiveCommerceToTray(products, query, intents);
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
    products = applyPersonaRanking(products, shopperPersona, commerceSessionMemory);
    products = applyMarketAwarenessRanking(products, query);
    dealClusters = buildDealClusters(products);
    searchIntelligence = buildSearchIntelligence(query, products, dealClusters);
    const bundleSuggestions = buildBundleSuggestions(products.slice(0, 36), query, shopperPersona);

    const { topCategory } = memoryPatchFromSearch(query);

    if (userId) {
      void recordSearchHistory(userId, query, products.length);
      void mergeRecommendationMemory(userId, query, topCategory, shopperPersona.labels);
    }

    const marketAwareness = computeMarketAwarenessForTray(query, products);

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
        data: emptySearchData(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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
        error: "BAD_REQUEST",
        message: "Invalid JSON body",
        data: emptySearchData(),
      },
      { status: 400 }
    );
  }
  try {
    return await handleSearch(q, { commerceMemory });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: "SEARCH_FAILED",
        message: e instanceof Error ? e.message : "Search could not complete.",
        data: emptySearchData(),
      },
      { status: 500 }
    );
  }
}

import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { enrichProductsWithIntelligence } from "@/lib/intelligence/enrichProducts";
import type { SearchCommerceAIMeta } from "@/lib/intelligence/commerceAnalysisTypes";
import { attachCommerceAiLayer } from "@/lib/intelligence/commerceAi/attachCommerceAiLayer";
import { resolveCommerceAiEngine } from "@/lib/intelligence/commerceAi/commerceAiEngine";
import {
  countSearchesTodayUtc,
  mergeRecommendationMemory,
  memoryPatchFromSearch,
  recordSearchHistory,
} from "@/lib/intelligence/persistence";
import { buildDealClusters } from "@/lib/deals";
import { buildSearchIntelligence } from "@/lib/intelligence/searchDecisionEngine";
import { enforceLimit, searchRatelimit } from "@/lib/rate-limit";
import { entitlementsForTier } from "@/lib/subscription/entitlements";
import { planDefinition } from "@/lib/subscription/plans";
import { subscriptionTierFromClerkUser } from "@/lib/subscription/resolveTier";
import type { DealClusterDTO } from "@/lib/deals/types";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { SearchEntitlementsDTO } from "@/lib/subscription/entitlements";
import type { QuantProduct } from "@/lib/shoppingScore";
import { fetchShoppingProducts } from "./lib/fetchShopping";

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

async function handleSearch(q: string | null | undefined): Promise<NextResponse> {
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

    const result = await fetchShoppingProducts(query);
    if (!result.ok) {
      const status =
        result.status >= 400 && result.status < 600 ? result.status : 502;
      return fail(status, "SEARCH_FAILED", result.error || "Search upstream failed.");
    }

    let products: QuantProduct[];
    try {
      products = enrichProductsWithIntelligence(result.products, query);
    } catch (e) {
      return fail(
        500,
        "SEARCH_FAILED",
        e instanceof Error ? e.message : "Search processing failed."
      );
    }

    let commerceMeta: SearchCommerceAIMeta;
    try {
      const layered = await attachCommerceAiLayer(products, query);
      products = layered.products;
      commerceMeta = layered.commerceMeta;
    } catch (e) {
      return fail(
        500,
        "SEARCH_FAILED",
        e instanceof Error ? e.message : "Commerce analysis failed."
      );
    }

    let dealClusters: DealClusterDTO[];
    let searchIntelligence: SearchIntelligenceDTO | null;
    try {
      dealClusters = buildDealClusters(products);
      searchIntelligence = buildSearchIntelligence(query, products, dealClusters);
    } catch (e) {
      return fail(
        500,
        "SEARCH_FAILED",
        e instanceof Error ? e.message : "Search intelligence failed."
      );
    }

    const { topCategory } = memoryPatchFromSearch(query);

    if (userId) {
      void recordSearchHistory(userId, query, products.length);
      void mergeRecommendationMemory(userId, query, topCategory);
    }

    const data: SearchDataPayload = {
      products,
      dealClusters,
      searchIntelligence,
      entitlements: entitlementsForTier(tier),
      meta: {
        category: topCategory,
        intelligenceVersion: 4,
        commerceAI: commerceMeta,
        commerceAiEngine: resolveCommerceAiEngine(),
      },
    };

    return jsonSearch({ success: true, data });
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
  try {
    const body = (await req.json()) as { query?: string; q?: string };
    q = body.query ?? body.q ?? null;
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

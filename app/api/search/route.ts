import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { enrichProductsWithIntelligence } from "@/lib/intelligence/enrichProducts";
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
import { fetchShoppingProducts } from "./lib/fetchShopping";

async function handleSearch(q: string | null | undefined) {
  const query = q?.trim();
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to run a product search." },
      { status: 401 }
    );
  }

  const user = await currentUser();
  const tier = subscriptionTierFromClerkUser(user);
  const plan = planDefinition(tier);
  const usedToday = await countSearchesTodayUtc(userId);
  if (usedToday !== null && usedToday >= plan.searchesPerDay) {
    return NextResponse.json(
      {
        error: `Daily search limit reached (${plan.searchesPerDay}) for your plan. Upgrade for more.`,
        code: "PLAN_SEARCH_LIMIT",
        entitlements: entitlementsForTier(tier),
      },
      { status: 429 }
    );
  }

  const limited = await enforceLimit(searchRatelimit, userId);
  if (!limited.ok) {
    return NextResponse.json(
      {
        error: "Too many searches. Try again later.",
        retryAfter: limited.retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );
  }

  const result = await fetchShoppingProducts(query);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const products = enrichProductsWithIntelligence(result.products, query);
  const dealClusters = buildDealClusters(products);
  const searchIntelligence = buildSearchIntelligence(query, products, dealClusters);
  const { topCategory } = memoryPatchFromSearch(query);

  void recordSearchHistory(userId, query, products.length);
  void mergeRecommendationMemory(userId, query, topCategory);

  return NextResponse.json({
    products,
    dealClusters,
    searchIntelligence,
    entitlements: entitlementsForTier(tier),
    meta: {
      category: topCategory,
      intelligenceVersion: 3,
    },
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  return handleSearch(q);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { query?: string; q?: string };
    const q = body.query ?? body.q ?? null;
    return handleSearch(q);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

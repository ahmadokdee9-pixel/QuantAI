/**
 * Phase 3 — Sparse result intelligence: detect weak trays + expansion query hints.
 */

import type { ExtractedSearchIntent } from "@/lib/search/intentExtractionEngine";
import type { ParsedSearchConstraints } from "@/lib/search/constraintExtractionEngine";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import { hardCategoryMismatch } from "@/lib/commerce/queryCategoryGuard";
import type { QuantProduct } from "@/lib/shoppingScore";

export type SparseResultAssessment = {
  sparse: boolean;
  relevantCount: number;
  totalCount: number;
  minTarget: number;
  expansionQueries: string[];
  reason: string | null;
};

const MIN_RELEVANT = 5;

function isRelevantListing(query: string, title: string): boolean {
  if (hardCategoryMismatch(query, title)) return false;
  return true;
}

/** Assess tray depth and produce upstream expansion queries when sparse. */
export function assessSparseResults(
  query: string,
  products: QuantProduct[],
  intent: ExtractedSearchIntent,
  constraints: ParsedSearchConstraints,
  canonical?: CanonicalQueryContract
): SparseResultAssessment {
  const relevant = products.filter((p) => isRelevantListing(query, p.title));
  const sparse = relevant.length < MIN_RELEVANT;
  const expansionQueries: string[] = [];

  if (sparse) {
    if (intent.brand && intent.productType !== "unknown") {
      expansionQueries.push(`${intent.brand} ${intent.productType}`.replace(/_/g, " "));
    }
    if (intent.productType === "graphics_card" && constraints.gpuModel) {
      expansionQueries.push(`${constraints.gpuModel} graphics card`);
    }
    if (intent.productType === "gaming_headset" && intent.platform) {
      expansionQueries.push(`${intent.platform} wireless gaming headset`);
    }
    if (intent.productType === "mechanical_keyboard") {
      expansionQueries.push("mechanical keyboard quiet tactile switch");
    }
    if (intent.productType === "monitor_mount") {
      expansionQueries.push("dual monitor arm desk mount");
    }
    if (intent.productType === "desk_accessory") {
      expansionQueries.push("desk cable management organizer tray");
    }
    if (intent.productType === "standing_desk") {
      expansionQueries.push("electric standing desk height adjustable");
    }
    if (intent.productType === "running_shoes" && intent.gender) {
      expansionQueries.push(`${intent.gender} running shoes stability support`);
    }
    if (intent.productType === "lipstick") {
      expansionQueries.push("MAC ruby woo lipstick");
    }
    if (constraints.sizeInches != null) {
      expansionQueries.push(`${constraints.sizeInches} inch smart tv 4k`);
    }
    if (canonical?.upstreamQuery) expansionQueries.push(canonical.upstreamQuery);
    expansionQueries.push(query);
  }

  const unique = [...new Set(expansionQueries.map((q) => q.trim()).filter(Boolean))];

  return {
    sparse,
    relevantCount: relevant.length,
    totalCount: products.length,
    minTarget: MIN_RELEVANT,
    expansionQueries: unique.slice(0, 6),
    reason: sparse ? `Only ${relevant.length} relevant listings (target ${MIN_RELEVANT})` : null,
  };
}

/** Build fallback queries for fetchShoppingProductsWithFallback when tray is thin. */
export function sparseExpansionQueriesForFetch(
  query: string,
  canonical: CanonicalQueryContract
): string[] {
  const intent = {
    brand: canonical.brand,
    productType: canonical.productType,
    platform: canonical.semantic.constraints.platform,
    gender: null as string | null,
  };
  const constraints = {
    gpuModel: query.match(/\b(rtx\s*\d{3,4}|gtx\s*\d{3,4})\b/i)?.[0] ?? null,
    sizeInches: query.match(/\b(\d{2,3})\s*inch\b/i)?.[1] ?? null,
  };
  const assessment = assessSparseResults(
    query,
    [],
    {
      category: canonical.category,
      productType: canonical.productType,
      subtype: null,
      brand: canonical.brand,
      useCase: null,
      userGoal: "general_discovery",
      gender: /\bmen'?s?\b/i.test(query) ? "men" : null,
      style: [],
      technicalRequirements: [],
      budgetConstraints: { maxPrice: canonical.budget.maxPrice, minPrice: null, currency: canonical.budget.currency, bestValue: false },
      platform: canonical.semantic.constraints.platform,
      performanceIntent: null,
    },
    {
      maxPrice: canonical.budget.maxPrice,
      minPrice: null,
      sizeInches: constraints.sizeInches ? Number(constraints.sizeInches) : null,
      refreshRateHz: null,
      requiresUsbC: /\busb[-\s]?c\b/i.test(query),
      gpuModel: constraints.gpuModel,
      sizeDimensions: null,
      materialTags: [],
      firmnessTags: [],
      platform: canonical.semantic.constraints.platform,
      rawTokens: [],
    },
    canonical
  );
  return assessment.expansionQueries;
}

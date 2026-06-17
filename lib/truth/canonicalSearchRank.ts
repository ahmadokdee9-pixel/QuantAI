/**
 * Phase A — Canonical search rank authority.
 * Single entry point for trust-driven ordering across API and client surfaces.
 */

import { buildTruthFoundationSnapshot } from "@/lib/truth/truthEvidenceBuilder";
import type { TruthFoundationPrefetchEntry, TruthFoundationSnapshot } from "@/lib/truth/truthFoundationTypes";
import {
  sortProductsByTrustDrivenRank,
  type TrustDrivenRankOptions,
  type TrustDrivenRankResult,
} from "@/lib/truth/trustDrivenCompositeRank";
import { resolveUnifiedSearchIntent, type UnifiedSearchIntent } from "@/lib/truth/unifiedIntentPipeline";
import type { QuantProduct } from "@/lib/shoppingScore";

export type CanonicalSearchRankResult = {
  orderedProducts: QuantProduct[];
  scoresByLink: Map<string, TrustDrivenRankResult>;
  orderLinks: string[];
};

const BUDGET_CAP_TOLERANCE = 1.05;
const HARD_MATCH_FLOOR = 55;
const INTENT_MISMATCH_FLOOR = 60;

function foundationCacheKey(
  product: QuantProduct,
  query: string,
  prefetch?: TruthFoundationPrefetchEntry | null
): string {
  return `${product.link}::${query}::${prefetch?.canonicalSkuId ?? "inline"}`;
}

function resolveFoundationForConstraint(args: {
  product: QuantProduct;
  query: string;
  prefetch?: TruthFoundationPrefetchEntry | null;
  foundationCache: Map<string, TruthFoundationSnapshot>;
}): TruthFoundationSnapshot {
  const key = foundationCacheKey(args.product, args.query, args.prefetch);
  const cached = args.foundationCache.get(key);
  if (cached) return cached;

  const foundation = buildTruthFoundationSnapshot({
    product: args.product,
    listingUrl: args.product.link,
    searchQuery: args.query,
    prefetch: args.prefetch ?? null,
  });
  args.foundationCache.set(key, foundation);
  return foundation;
}

function productViolatesHardConstraints(args: {
  product: QuantProduct;
  list: QuantProduct[];
  query: string;
  prefetch?: TruthFoundationPrefetchEntry | null;
  foundationCache: Map<string, TruthFoundationSnapshot>;
  unified: UnifiedSearchIntent;
}): boolean {
  const foundation = resolveFoundationForConstraint({
    product: args.product,
    query: args.query,
    prefetch: args.prefetch,
    foundationCache: args.foundationCache,
  });
  const match = foundation.productMatch;
  const constraints = foundation.purchaseConstraints;
  const reasoning = foundation.productReasoning;
  const recommendation = foundation.recommendationIntelligence;
  const intent = args.unified.intentEngine?.intent;

  if (constraints.hardRequirements.length > 0 && match.overallMatchScore < HARD_MATCH_FLOOR) {
    return true;
  }

  if (match.strongestMismatchReason && match.overallMatchScore < INTENT_MISMATCH_FLOOR) {
    return true;
  }

  if (recommendation.recommendationTier === "NOT_RECOMMENDED") {
    return true;
  }

  if (reasoning.recommendationStrength === "WEAK" && match.overallMatchScore < HARD_MATCH_FLOOR) {
    return true;
  }

  if (intent?.useCase && intent.useCase !== "general") {
    const useCaseMatch = match.useCaseMatchScore ?? match.overallMatchScore;
    if (useCaseMatch < HARD_MATCH_FLOOR) {
      return true;
    }
  }

  const budget = intent?.budget;
  if (budget != null && args.product.price > 0) {
    const cap = budget * BUDGET_CAP_TOLERANCE;
    const hasInCap = args.list.some((row) => row.price > 0 && row.price <= cap);
    if (hasInCap && args.product.price > cap) {
      return true;
    }
  }

  return false;
}

/** Post-sort demotion — hard mismatches sink below compliant listings (no new scoring). */
export function applyHardConstraintGate(
  ordered: QuantProduct[],
  query: string,
  options?: TrustDrivenRankOptions
): QuantProduct[] {
  if (ordered.length <= 1) return ordered;

  const unified = options?.unified ?? resolveUnifiedSearchIntent(query);
  const foundationCache = options?.foundationCache ?? new Map<string, TruthFoundationSnapshot>();
  const prefetchByLink = options?.truthPrefetchByLink;

  const pass: QuantProduct[] = [];
  const fail: QuantProduct[] = [];

  for (const product of ordered) {
    const violates = productViolatesHardConstraints({
      product,
      list: ordered,
      query,
      prefetch: prefetchByLink?.get(product.link) ?? null,
      foundationCache,
      unified,
    });
    (violates ? fail : pass).push(product);
  }

  if (fail.length === 0 || pass.length === 0) return ordered;
  return [...pass, ...fail];
}

/** Canonical trust-driven tray order — the only default-path ranking authority. */
export function resolveCanonicalSearchRank(
  list: QuantProduct[],
  query: string,
  options?: TrustDrivenRankOptions
): CanonicalSearchRankResult {
  if (list.length === 0) {
    return { orderedProducts: list, scoresByLink: new Map(), orderLinks: [] };
  }

  const foundationCache = options?.foundationCache ?? new Map<string, TruthFoundationSnapshot>();
  const rankOptions: TrustDrivenRankOptions = {
    ...options,
    foundationCache,
  };

  const { sorted, scoresByLink } = sortProductsByTrustDrivenRank(list, query, rankOptions);
  const gated = applyHardConstraintGate(sorted, query, rankOptions);
  const orderedProducts = gated.map((product, index) => ({ ...product, qiRank: index }));

  return {
    orderedProducts,
    scoresByLink,
    orderLinks: orderedProducts.map((product) => product.link),
  };
}

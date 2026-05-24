/**
 * Phase 4 — Authoritative identity foundation builder (shadow-safe, no ranking mutation).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { NormalizationTrayMeta } from "@/lib/intelligence/normalization/types";
import { readIdentityFoundationFlags } from "./flags";
import { buildCanonicalProductGraph, graphCoverage } from "./canonicalProductGraph";
import { ingestTrayPrices } from "./pricing/merchantPriceTimeline";
import { computeTrustSignals } from "./trust/trustSignals";
import { buildCanonicalRetrievalSurface } from "./retrieval/canonicalRetrievalSurface";
import type { IdentityFoundationResult, IdentityFoundationMeta } from "./types";
import { IDENTITY_FOUNDATION_VERSION } from "./types";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export type BuildIdentityFoundationInput = {
  products: QuantProduct[];
  query: string;
  normalizationMeta?: NormalizationTrayMeta | null;
};

/**
 * Build canonical identity graph + trust + retrieval surface.
 * Does NOT reorder or filter products (shadow observability only).
 */
export function buildIdentityFoundation(
  input: BuildIdentityFoundationInput
): IdentityFoundationResult {
  const started = Date.now();
  const flags = readIdentityFoundationFlags();
  const { products, query, normalizationMeta } = input;

  if (!flags.enabled || products.length === 0) {
    const emptyMeta: IdentityFoundationMeta = {
      version: IDENTITY_FOUNDATION_VERSION,
      enabled: flags.enabled,
      shadowOnly: true,
      query,
      inputCount: products.length,
      canonicalProductCount: 0,
      identityCoverage: 0,
      falseCollapseBlocked: 0,
      duplicateSuppressionCount: 0,
      avgIdentityConfidence: 0,
      merchantOfferCount: 0,
      latencyMs: Date.now() - started,
      graph: { nodeCount: 0, edgeCount: 0 },
    };
    return {
      products,
      meta: emptyMeta,
      canonicalProducts: [],
      boundaryTraces: [],
      trustByCommerceId: {},
      retrievalSurfaceId: "",
    };
  }

  ingestTrayPrices(products);

  const graph = buildCanonicalProductGraph(products, normalizationMeta?.groups ?? []);
  const coverage = graphCoverage(graph.nodes, products.length);
  const avgConfidence =
    graph.nodes.length > 0
      ? round4(
          graph.nodes.reduce((s, n) => s + n.identityConfidence, 0) / graph.nodes.length
        )
      : 0;

  const duplicateSuppressionCount =
    normalizationMeta?.collapsedListingCount ??
    normalizationMeta?.duplicateListingCount ??
    0;

  const trustByCommerceId: IdentityFoundationResult["trustByCommerceId"] = {};
  for (const node of graph.nodes) {
    const sample = products.find(
      (p) =>
        p.qiNormalizedCommerce?.commerceId === node.commerceId ||
        p.link === node.offers[0]?.link
    );
    if (sample) {
      trustByCommerceId[node.commerceId] = computeTrustSignals(
        node.commerceId,
        node.offers,
        sample,
        products
      );
    }
  }

  const retrieval = buildCanonicalRetrievalSurface(
    { query, maxResults: Math.min(20, graph.nodes.length) },
    graph.nodes
  );

  const meta: IdentityFoundationMeta = {
    version: IDENTITY_FOUNDATION_VERSION,
    enabled: true,
    shadowOnly: true,
    query,
    inputCount: products.length,
    canonicalProductCount: graph.nodes.length,
    identityCoverage: coverage,
    falseCollapseBlocked: graph.falseCollapseBlocked,
    duplicateSuppressionCount,
    avgIdentityConfidence: avgConfidence,
    merchantOfferCount: graph.nodes.reduce((s, n) => s + n.offers.length, 0),
    latencyMs: Date.now() - started,
    graph: { nodeCount: graph.nodes.length, edgeCount: graph.edges.length },
  };

  return {
    products,
    meta,
    canonicalProducts: graph.nodes,
    boundaryTraces: graph.boundaryTraces,
    trustByCommerceId,
    retrievalSurfaceId: retrieval.surfaceId,
  };
}

export function identityFoundationMetaForSearch(
  result: IdentityFoundationResult
): Record<string, unknown> {
  if (!result.meta.enabled) return {};
  return {
    identityFoundation: result.meta,
    identityFoundationShadow: {
      canonicalProducts: result.canonicalProducts.slice(0, 12).map((n) => ({
        canonicalProductId: n.canonicalProductId,
        commerceId: n.commerceId,
        identityConfidence: n.identityConfidence,
        merchantCount: n.merchantCount,
        offerCount: n.offers.length,
        priceMedian: n.priceMedian,
      })),
      boundaryTraceCount: result.boundaryTraces.length,
      conflictTraceCount: result.boundaryTraces.filter((t) => t.conflict).length,
      retrievalSurfaceId: result.retrievalSurfaceId,
      trustSample: Object.entries(result.trustByCommerceId)
        .slice(0, 5)
        .map(([commerceId, t]) => ({
          commerceId,
          merchantConsistency01: t.merchantConsistency01,
          suspiciousDiscountSpike01: t.suspiciousDiscountSpike01,
          explanations: t.explanations.slice(0, 3),
        })),
    },
  };
}

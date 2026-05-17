/**
 * QuantAI Live Commerce Discovery Engine v1.
 * Expands, refreshes, fuses, dedupes, and live-ranks products before enrichment.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import { buildExternalMerchantCandidates, type ExternalMerchantCandidate } from "./externalMerchantSearch";
import { refreshLiveMarketProducts } from "./liveMarketRefresh";
import { mergeExternalAndInternalOffersWithoutEarlyCollapse } from "./productFeedFusion";
import { rankLiveDeals } from "./liveDealRanking";

export type LiveCommerceDiscoveryMeta = {
  version: 1;
  status: "enabled" | "disabled" | "disabled_missing_key" | "failed";
  candidateCount: number;
  candidateMerchants: string[];
  attemptedQueries: string[];
  externalRows: number;
  fusedRows: number;
  timedOut: boolean;
  source: "serpapi" | "disabled" | "disabled_missing_key" | "empty";
  error?: string;
};

export type LiveCommerceDiscoveryResult = {
  products: QuantProduct[];
  candidates: ExternalMerchantCandidate[];
  meta: LiveCommerceDiscoveryMeta;
};

export async function runLiveCommerceDiscovery(
  query: string,
  internalProducts: QuantProduct[],
  canonicalQuery?: CanonicalQueryContract
): Promise<LiveCommerceDiscoveryResult> {
  if (process.env.ENABLE_WIDE_DISCOVERY !== "true") {
    return {
      products: internalProducts,
      candidates: [],
      meta: {
        version: 1,
        status: "disabled",
        candidateCount: 0,
        candidateMerchants: [],
        attemptedQueries: [],
        externalRows: 0,
        fusedRows: internalProducts.length,
        timedOut: false,
        source: "disabled",
      },
    };
  }
  const candidates = buildExternalMerchantCandidates(query, canonicalQuery);
  const refresh = await refreshLiveMarketProducts(query, candidates, canonicalQuery);
  const fused = mergeExternalAndInternalOffersWithoutEarlyCollapse({
    internal: internalProducts,
    external: refresh.products,
    query,
  });
  const products = rankLiveDeals(fused, query);
  return {
    products,
    candidates,
    meta: {
      version: 1,
      status: refresh.source === "disabled_missing_key" ? "disabled_missing_key" : refresh.source === "disabled" ? "disabled" : "enabled",
      candidateCount: candidates.length,
      candidateMerchants: candidates.map((c) => c.label).slice(0, 80),
      attemptedQueries: refresh.attemptedQueries,
      externalRows: refresh.products.length,
      fusedRows: products.length,
      timedOut: refresh.timedOut,
      source: refresh.source,
    },
  };
}

/**
 * QuantAI Live Commerce Discovery Engine v1.
 * Expands, refreshes, fuses, dedupes, and live-ranks products before enrichment.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { buildExternalMerchantCandidates, type ExternalMerchantCandidate } from "./externalMerchantSearch";
import { refreshLiveMarketProducts } from "./liveMarketRefresh";
import { fuseProductFeeds } from "./productFeedFusion";
import { rankLiveDeals } from "./liveDealRanking";

export type LiveCommerceDiscoveryMeta = {
  version: 1;
  candidateCount: number;
  candidateMerchants: string[];
  attemptedQueries: string[];
  externalRows: number;
  fusedRows: number;
  timedOut: boolean;
  source: "serpapi" | "disabled" | "empty";
};

export type LiveCommerceDiscoveryResult = {
  products: QuantProduct[];
  candidates: ExternalMerchantCandidate[];
  meta: LiveCommerceDiscoveryMeta;
};

export async function runLiveCommerceDiscovery(
  query: string,
  internalProducts: QuantProduct[]
): Promise<LiveCommerceDiscoveryResult> {
  const candidates = buildExternalMerchantCandidates(query);
  const refresh = await refreshLiveMarketProducts(query, candidates);
  const fused = fuseProductFeeds({
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
      candidateCount: candidates.length,
      candidateMerchants: candidates.map((c) => c.label).slice(0, 10),
      attemptedQueries: refresh.attemptedQueries,
      externalRows: refresh.products.length,
      fusedRows: products.length,
      timedOut: refresh.timedOut,
      source: refresh.source,
    },
  };
}

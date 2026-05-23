import type { QuantProduct } from "@/lib/shoppingScore";
import { analyzeDealCluster } from "./dealAnalysis";
import { clusterProducts } from "./clusterEngine";
import type { DealClusterDTO } from "./types";

/**
 * Builds cross-retailer deal clusters + per-listing intelligence for the search payload.
 * Uses equivalenceClassId clustering when qiNormalizedCommerce is present (Phase 0 Sprint 2).
 */
export function buildDealClusters(products: QuantProduct[]): DealClusterDTO[] {
  if (products.length === 0) return [];
  const groups = clusterProducts(products);
  let dealIndex = 0;
  return groups.map((listings) => {
    const eqId = listings[0]?.qiNormalizedCommerce?.equivalenceClassId;
    const clusterId = eqId ? `eq-${eqId.replace(/^qcec_/, "")}` : `deal-${dealIndex++}`;
    return analyzeDealCluster(clusterId, listings);
  });
}

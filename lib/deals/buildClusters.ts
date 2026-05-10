import type { QuantProduct } from "@/lib/shoppingScore";
import { analyzeDealCluster } from "./dealAnalysis";
import { clusterProductsByTitle } from "./clusterEngine";
import type { DealClusterDTO } from "./types";

/**
 * Builds cross-retailer deal clusters + per-listing intelligence for the search payload.
 */
export function buildDealClusters(products: QuantProduct[]): DealClusterDTO[] {
  if (products.length === 0) return [];
  const groups = clusterProductsByTitle(products);
  let i = 0;
  return groups.map((listings) => analyzeDealCluster(`deal-${i++}`, listings));
}

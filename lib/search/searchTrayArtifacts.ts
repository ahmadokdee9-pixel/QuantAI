/**
 * Phase 1 — Tray artifact lifecycle (dealClusters, searchIntelligence) tied to final product order.
 */

import { buildDealClusters } from "@/lib/deals";
import { buildSearchIntelligence } from "@/lib/intelligence/searchDecisionEngine";
import type { DealClusterDTO } from "@/lib/deals/types";
import type { SearchIntelligenceDTO } from "@/lib/intelligence/searchDecisionTypes";
import type { QuantProduct } from "@/lib/shoppingScore";

export type SearchTrayArtifacts = {
  dealClusters: DealClusterDTO[];
  searchIntelligence: SearchIntelligenceDTO | null;
  rebuiltAt: string;
  productFingerprint: string;
};

function productOrderFingerprint(products: QuantProduct[]): string {
  return products
    .slice(0, 40)
    .map((p) => p.link || p.title)
    .join("|");
}

/** Rebuild downstream artifacts from the authoritative final product tray. */
export function rebuildSearchTrayArtifacts(
  query: string,
  products: QuantProduct[]
): SearchTrayArtifacts {
  const dealClusters = buildDealClusters(products);
  const searchIntelligence = buildSearchIntelligence(query, products, dealClusters);
  return {
    dealClusters,
    searchIntelligence,
    rebuiltAt: new Date().toISOString(),
    productFingerprint: productOrderFingerprint(products),
  };
}

export type TrayMetaCoherenceReport = {
  ok: boolean;
  productFingerprint: string;
  clusterFingerprint: string;
  mismatch: boolean;
  details?: string;
};

/** CI guard — cluster representatives must align with top of final tray when clusters exist. */
export function verifyTrayMetaCoherence(
  products: QuantProduct[],
  dealClusters: DealClusterDTO[]
): TrayMetaCoherenceReport {
  const productFingerprint = productOrderFingerprint(products);
  if (!products.length || !dealClusters.length) {
    return {
      ok: true,
      productFingerprint,
      clusterFingerprint: "",
      mismatch: false,
    };
  }

  const topLinks = new Set(products.slice(0, 12).map((p) => p.link).filter(Boolean));
  const clusterLinks = dealClusters
    .flatMap((c) => c.listings?.map((o) => o.link) ?? [])
    .filter(Boolean);
  const overlap = clusterLinks.filter((l) => topLinks.has(l)).length;
  const mismatch = clusterLinks.length > 0 && overlap === 0;

  return {
    ok: !mismatch,
    productFingerprint,
    clusterFingerprint: clusterLinks.slice(0, 12).join("|"),
    mismatch,
    details: mismatch ? "cluster offers disjoint from top tray links" : undefined,
  };
}

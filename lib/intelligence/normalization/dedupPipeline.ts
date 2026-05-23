/**
 * Deduplication pipeline — select tray representatives after reconciliation + equivalence clustering.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type {
  NormalizationCollapseReason,
  NormalizationEquivalenceGroup,
  NormalizationMode,
  NormalizedListingRecord,
} from "./types";
import { buildRankingIdentityKey } from "./canonicalId";
import { findExactListingDuplicateGroups, reconcileMerchantDuplicates, representativeScore } from "./merchantReconciliation";
import { buildEquivalenceGraph, type EquivalenceCluster } from "./equivalenceGraph";
import { collapseVariantDuplicates, selectVariantRepresentatives } from "./variantCollapse";

export type DedupResolution = {
  representativeLinks: Set<string>;
  duplicateOf: Map<string, string>;
  collapseReasons: Map<string, NormalizationCollapseReason>;
  merchantReconciled: Set<string>;
  equivalenceGroups: NormalizationEquivalenceGroup[];
};

function pickClusterRepresentative(
  cluster: EquivalenceCluster,
  records: NormalizedListingRecord[]
): NormalizedListingRecord {
  const members = cluster.memberIndices.map((i) => records[i]!);
  return [...members].sort((a, b) => representativeScore(b.product) - representativeScore(a.product))[0]!;
}

export function runDedupPipeline(
  records: NormalizedListingRecord[],
  mode: NormalizationMode
): DedupResolution {
  const duplicateOf = new Map<string, string>();
  const collapseReasons = new Map<string, NormalizationCollapseReason>();
  const merchantReconciled = new Set<string>();
  const representativeLinks = new Set<string>(records.map((r) => r.product.link));

  for (const rec of records) {
    collapseReasons.set(rec.product.link, "none");
  }

  // Stage 1: exact listing key duplicates
  const exactGroups = findExactListingDuplicateGroups(records);
  for (const members of exactGroups.values()) {
    const sorted = [...members].sort(
      (a, b) => representativeScore(b.product) - representativeScore(a.product)
    );
    const keep = sorted[0]!;
    for (const drop of sorted.slice(1)) {
      duplicateOf.set(drop.product.link, keep.product.link);
      collapseReasons.set(drop.product.link, "exact_listing_duplicate");
      representativeLinks.delete(drop.product.link);
    }
  }

  // Stage 2: same-merchant near-duplicate reconciliation
  const merchantMap = reconcileMerchantDuplicates(records);
  for (const [link, { representativeLink, merchantReconciled: reconciled }] of merchantMap) {
    if (representativeLink !== link) {
      duplicateOf.set(link, representativeLink);
      collapseReasons.set(link, "same_merchant_near_duplicate");
      representativeLinks.delete(link);
    }
    if (reconciled) merchantReconciled.add(link);
  }

  // Stage 3: equivalence graph clustering
  const clusters = buildEquivalenceGraph(records);
  const equivalenceGroups: NormalizationEquivalenceGroup[] = [];

  for (const cluster of clusters) {
    const rep = pickClusterRepresentative(cluster, records);
    const memberLinks = cluster.memberIndices.map((i) => records[i]!.product.link);
    const stores = new Set(
      cluster.memberIndices.map((i) => records[i]!.product.store.trim().toLowerCase())
    );

    equivalenceGroups.push({
      equivalenceClassId: cluster.equivalenceClassId,
      memberLinks,
      representativeLink: rep.product.link,
      commerceIds: cluster.commerceIds,
      merchantCount: stores.size,
      collapseReason:
        cluster.memberIndices.length > 1 ? "cross_merchant_equivalent" : "none",
    });

    if (mode === "collapse" && cluster.memberIndices.length > 1) {
      for (const idx of cluster.memberIndices) {
        const link = records[idx]!.product.link;
        if (link === rep.product.link) continue;
        if (!representativeLinks.has(link)) continue;
        duplicateOf.set(link, rep.product.link);
        collapseReasons.set(link, "cross_merchant_equivalent");
        representativeLinks.delete(link);
      }
    }
  }

  // Stage 4: variant-level collapse within variant key (dedup + collapse modes)
  if (mode === "dedup" || mode === "collapse") {
    const variantDecisions = collapseVariantDuplicates(
      records.filter((r) => representativeLinks.has(r.product.link))
    );
    for (const d of variantDecisions) {
      for (const drop of d.dropLinks) {
        if (!representativeLinks.has(drop)) continue;
        duplicateOf.set(drop, d.keepLink);
        collapseReasons.set(drop, d.reason);
        representativeLinks.delete(drop);
      }
    }
  }

  return {
    representativeLinks,
    duplicateOf,
    collapseReasons,
    merchantReconciled,
    equivalenceGroups,
  };
}

export function attachNormalizedIdentity(
  record: NormalizedListingRecord,
  resolution: DedupResolution,
  equivalenceClassId: string
): QuantProduct["qiNormalizedCommerce"] {
  const link = record.product.link;
  const repLink = resolution.duplicateOf.get(link) ?? link;
  const isRepresentative = resolution.representativeLinks.has(link);
  const collapseReason = resolution.collapseReasons.get(link) ?? "none";

  return {
    commerceId: record.commerceId,
    familyGraphId: record.familyGraphId,
    equivalenceClassId,
    listingKey: record.listingKey,
    variantKey: record.variantKey,
    rankingIdentityKey: buildRankingIdentityKey(record.commerceId, record.listingKey, record.product.store),
    isRepresentative,
    duplicateOfLink: isRepresentative ? null : repLink,
    collapseReason,
    merchantReconciled: resolution.merchantReconciled.has(link),
    identifierAnchors: record.identifierAnchors,
    normalizationVersion: "p0.1",
  };
}

export function computeTop3DuplicateRate(products: QuantProduct[], keyFn: (p: QuantProduct) => string): number {
  const top = products.slice(0, 3);
  if (top.length === 0) return 0;
  const keys = top.map(keyFn);
  const unique = new Set(keys).size;
  return 1 - unique / top.length;
}

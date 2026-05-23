/**
 * QuantAI Phase 0 — Canonical Commerce Identity normalization orchestrator.
 * Entry point: normalizeCommerceProductTray()
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { readNormalizationFlags } from "./flags";
import { buildNormalizedListingRecord, buildRankingIdentityKey } from "./canonicalId";
import {
  attachNormalizedIdentity,
  computeTop3DuplicateRate,
  runDedupPipeline,
} from "./dedupPipeline";
import { buildEquivalenceGraph } from "./equivalenceGraph";
import type {
  NormalizationMode,
  NormalizationOptions,
  NormalizationTrayMeta,
  NormalizationTrayResult,
} from "./types";
import { NORMALIZATION_VERSION } from "./types";

function linkToEquivalenceClass(
  records: ReturnType<typeof buildNormalizedListingRecord>[],
  clusters: ReturnType<typeof buildEquivalenceGraph>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const cluster of clusters) {
    for (const idx of cluster.memberIndices) {
      map.set(records[idx]!.product.link, cluster.equivalenceClassId);
    }
  }
  return map;
}

function defaultKeyFn(p: QuantProduct): string {
  const n = p.qiNormalizedCommerce;
  if (n?.rankingIdentityKey) return n.rankingIdentityKey;
  return `${p.store}::${p.link}::${p.title.slice(0, 40)}`;
}

/**
 * Normalize a product tray: assign canonical commerce IDs, detect duplicates,
 * optionally collapse equivalents, and return enriched products + telemetry meta.
 */
export function normalizeCommerceProductTray(
  products: QuantProduct[],
  searchQuery: string,
  options: NormalizationOptions = {}
): NormalizationTrayResult {
  const flags = readNormalizationFlags();
  const enabled = flags.enabled;
  const mode: NormalizationMode = options.mode ?? flags.mode;
  const apply = options.apply ?? flags.apply;

  if (!enabled || products.length === 0) {
    return {
      products,
      meta: emptyMeta(products.length, enabled, mode, apply),
    };
  }

  const records = products.map((p, index) => buildNormalizedListingRecord(p, index));
  const clusters = buildEquivalenceGraph(records);
  const eqClassByLink = linkToEquivalenceClass(records, clusters);

  const pipelineMode =
    mode === "shadow" || mode === "meta_only" ? "dedup" : mode;
  const dedupResolution = runDedupPipeline(records, pipelineMode);

  const top3Before = computeTop3DuplicateRate(products, defaultKeyFn);

  const enriched: QuantProduct[] = products.map((p, index) => {
    const rec = records[index]!;
    const eqId = eqClassByLink.get(p.link) ?? rec.commerceId;
    const qiNormalizedCommerce = attachNormalizedIdentity(rec, dedupResolution, eqId);
    return { ...p, qiNormalizedCommerce };
  });

  let output = enriched;
  if (apply && mode !== "shadow" && mode !== "meta_only") {
    output = enriched.filter((p) => p.qiNormalizedCommerce?.isRepresentative !== false);
    output = output.map((p, i) => ({ ...p, id: i + 1 }));
  }

  const top3After = computeTop3DuplicateRate(output, defaultKeyFn);
  const collapsed = enriched.filter((p) => p.qiNormalizedCommerce && !p.qiNormalizedCommerce.isRepresentative).length;
  const dupes = dedupResolution.duplicateOf.size;

  const meta: NormalizationTrayMeta = {
    enabled: true,
    mode,
    apply,
    version: NORMALIZATION_VERSION,
    inputCount: products.length,
    outputCount: output.length,
    duplicateListingCount: dupes,
    collapsedListingCount: collapsed,
    equivalenceGroupCount: clusters.filter((c) => c.memberIndices.length > 1).length,
    uniqueCommerceIdCount: new Set(records.map((r) => r.commerceId)).size,
    uniqueFamilyGraphIdCount: new Set(records.map((r) => r.familyGraphId)).size,
    top3DuplicateRateBefore: round4(top3Before),
    top3DuplicateRateAfter: round4(top3After),
    groups: dedupResolution.equivalenceGroups.filter((g) => g.memberLinks.length > 1),
  };

  void searchQuery; // reserved for Phase 4 query-kernel weighting

  return { products: output, meta };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function emptyMeta(
  count: number,
  enabled: boolean,
  mode: NormalizationMode,
  apply: boolean
): NormalizationTrayMeta {
  return {
    enabled,
    mode,
    apply,
    version: NORMALIZATION_VERSION,
    inputCount: count,
    outputCount: count,
    duplicateListingCount: 0,
    collapsedListingCount: 0,
    equivalenceGroupCount: 0,
    uniqueCommerceIdCount: 0,
    uniqueFamilyGraphIdCount: 0,
    top3DuplicateRateBefore: 0,
    top3DuplicateRateAfter: 0,
    groups: [],
  };
}

export { buildRankingIdentityKey };

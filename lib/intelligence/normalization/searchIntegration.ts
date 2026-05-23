/**
 * Production search integration — live tray normalization + shadow telemetry.
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import { readNormalizationFlags } from "./flags";
import { normalizeCommerceProductTray } from "./normalizeProductTray";
import { enrichShadowTelemetry } from "./shadowMetrics";
import type {
  NormalizationShadowTelemetry,
  NormalizationTrayMeta,
  NormalizationStage,
} from "./types";

export type SearchNormalizationIntegrationResult = {
  products: QuantProduct[];
  meta: NormalizationTrayMeta;
  shadowTelemetry: NormalizationShadowTelemetry;
  latencyMs: number;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function top3UniqueCommerceIds(products: QuantProduct[]): number {
  const top = products.slice(0, 3);
  const ids = top.map(
    (p) => p.qiNormalizedCommerce?.commerceId ?? p.qiNormalizedCommerce?.rankingIdentityKey ?? p.link
  );
  return new Set(ids).size;
}

function top5MerchantDuplicatePairs(products: QuantProduct[]): number {
  const top = products.slice(0, 5);
  let pairs = 0;
  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length; j++) {
      const a = top[i]!;
      const b = top[j]!;
      if (a.store.toLowerCase() === b.store.toLowerCase()) {
        const idA = a.qiNormalizedCommerce?.commerceId;
        const idB = b.qiNormalizedCommerce?.commerceId;
        if (idA && idB && idA === idB) pairs++;
      }
    }
  }
  return pairs;
}

function clusterCoherenceScore(products: QuantProduct[]): number {
  const top = products.slice(0, 5);
  if (top.length === 0) return 1;
  const withEq = top.filter((p) => p.qiNormalizedCommerce?.equivalenceClassId);
  if (withEq.length === 0) return 0.5;
  const uniqueEq = new Set(withEq.map((p) => p.qiNormalizedCommerce!.equivalenceClassId)).size;
  return round4(uniqueEq / top.length);
}

/** Run normalization on live search tray (post-ranking stage). */
export function integrateNormalizationInSearchTray(
  products: QuantProduct[],
  searchQuery: string,
  stage: NormalizationStage,
  options: { searchLatencyMs?: number } = {}
): SearchNormalizationIntegrationResult {
  const started = Date.now();
  const flags = readNormalizationFlags();
  const searchLatencyMs = options.searchLatencyMs ?? 0;

  if (!flags.enabled || products.length === 0) {
    const emptyMeta: NormalizationTrayMeta = {
      enabled: flags.enabled,
      mode: flags.mode,
      apply: flags.apply,
      version: "p0.1",
      inputCount: products.length,
      outputCount: products.length,
      duplicateListingCount: 0,
      collapsedListingCount: 0,
      equivalenceGroupCount: 0,
      uniqueCommerceIdCount: 0,
      uniqueFamilyGraphIdCount: 0,
      top3DuplicateRateBefore: 0,
      top3DuplicateRateAfter: 0,
      groups: [],
    };
    return {
      products,
      meta: emptyMeta,
      shadowTelemetry: buildShadowTelemetry(stage, emptyMeta, products, products, 0),
      latencyMs: 0,
    };
  }

  const beforeTop3Unique = top3UniqueCommerceIds(products);
  const { products: normalized, meta } = normalizeCommerceProductTray(products, searchQuery, {
    mode: flags.mode,
    apply: flags.apply,
  });

  const latencyMs = Date.now() - started;
  const afterTop3Unique = top3UniqueCommerceIds(normalized);
  const enrichedMeta: NormalizationTrayMeta = {
    ...meta,
    stage,
    latencyMs,
    top3UniqueCommerceIdsBefore: beforeTop3Unique,
    top3UniqueCommerceIdsAfter: afterTop3Unique,
  };

  const outputProducts = normalized.map((p) => ({
    ...p,
    qiNormalizationMeta: enrichedMeta,
  }));

  const baseShadow = buildShadowTelemetry(stage, enrichedMeta, products, outputProducts, latencyMs);
  const shadowTelemetry =
    flags.shadowTelemetry && !flags.apply
      ? enrichShadowTelemetry(baseShadow, products, outputProducts, enrichedMeta, searchLatencyMs)
      : baseShadow;

  return {
    products: outputProducts,
    meta: enrichedMeta,
    shadowTelemetry,
    latencyMs,
  };
}

export function buildShadowTelemetry(
  stage: NormalizationStage,
  meta: NormalizationTrayMeta,
  before: QuantProduct[],
  after: QuantProduct[],
  latencyMs: number
): NormalizationShadowTelemetry {
  return {
    stage,
    recordedAt: new Date().toISOString(),
    enabled: meta.enabled,
    mode: meta.mode,
    apply: meta.apply,
    version: meta.version,
    inputCount: meta.inputCount,
    outputCount: meta.outputCount,
    duplicateListingCount: meta.duplicateListingCount,
    collapsedListingCount: meta.collapsedListingCount,
    equivalenceGroupCount: meta.equivalenceGroupCount,
    top3DuplicateRateBefore: meta.top3DuplicateRateBefore,
    top3DuplicateRateAfter: meta.top3DuplicateRateAfter,
    top3UniqueCommerceIdsBefore: meta.top3UniqueCommerceIdsBefore ?? top3UniqueCommerceIds(before),
    top3UniqueCommerceIdsAfter: meta.top3UniqueCommerceIdsAfter ?? top3UniqueCommerceIds(after),
    top5MerchantDuplicatePairs: top5MerchantDuplicatePairs(after),
    clusterCoherenceTop5: clusterCoherenceScore(after),
    rankingLiftEstimate: round4(
      (meta.top3DuplicateRateBefore ?? 0) - (meta.top3DuplicateRateAfter ?? 0)
    ),
    latencyMs,
  };
}

/** Extract response-safe normalization meta for search API. */
export function normalizationMetaForSearchResponse(
  meta: NormalizationTrayMeta,
  shadowTelemetry: NormalizationShadowTelemetry,
  searchLatencyMs = 0
): Record<string, unknown> {
  const enriched = shadowTelemetry;

  return {
    qiNormalizationMeta: meta,
    normalizationShadowTelemetry: enriched,
    normalizationStage1: {
      rollout: "stage1_shadow",
      rankingMutation: false,
      readinessScore: enriched.rolloutReadinessScore ?? 0,
      readinessGrade: enriched.rolloutReadinessGrade ?? "NOT_READY",
    },
    normalizationProduction: {
      enabled: meta.enabled,
      mode: meta.mode,
      apply: meta.apply,
      version: meta.version,
      stage: meta.stage ?? enriched.stage,
      top3DuplicateRateBefore: meta.top3DuplicateRateBefore,
      top3DuplicateRateAfter: meta.top3DuplicateRateAfter,
      top3DuplicateRateDelta: round4(
        meta.top3DuplicateRateBefore - meta.top3DuplicateRateAfter
      ),
      rankingLiftEstimate: enriched.rankingLiftEstimate,
      projectedRankingLift: enriched.projectedRankingLift ?? enriched.rankingLiftEstimate,
      projectedTop3DuplicateRate: enriched.projectedTop3DuplicateRate,
      equivalenceGroupCount: meta.equivalenceGroupCount,
      canonicalIdentityCoverage: enriched.canonicalIdentityCoverage,
      merchantDiversityScoreBefore: enriched.merchantDiversityScoreBefore,
      merchantDiversityScoreAfter: enriched.merchantDiversityScoreAfter,
      merchantDiversityDelta: enriched.merchantDiversityDelta,
      semanticCoherenceScore: enriched.semanticCoherenceScore,
      falseCollapseIncidents: enriched.falseCollapseIncidents,
      latencyMs: meta.latencyMs ?? enriched.latencyMs,
      latencyPctOfSearch:
        searchLatencyMs > 0
          ? round4((meta.latencyMs ?? enriched.latencyMs) / searchLatencyMs)
          : 0,
    },
  };
}

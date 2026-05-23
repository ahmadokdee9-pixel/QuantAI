#!/usr/bin/env node
/**
 * Golden-query normalization ranking benchmark — offline + optional live search.
 * Usage:
 *   npm run test:normalization-ranking
 *   SEARCH_BASE_URL=https://... npm run test:normalization-ranking -- --live
 */
import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { GOLDEN_CASES } from "./lib/normalizationGoldenFixtures.mjs";
import { normalizeCommerceProductTray, readNormalizationFlags } from "../lib/intelligence/normalization/index.ts";
import { buildDealClusters } from "../lib/deals/buildClusters.ts";
import { semanticRerankSearchResults } from "../lib/search/semanticReranker.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";

const LIVE = process.argv.includes("--live");
const BASE_URL = process.env.SEARCH_BASE_URL || "http://localhost:3000";
const OUT_DIR = join(process.cwd(), "docs", "architecture-audit", "benchmarks");

function top3DuplicateRate(products) {
  const top = products.slice(0, 3);
  if (top.length === 0) return 0;
  const keys = top.map(
    (p) => p.qiNormalizedCommerce?.rankingIdentityKey ?? `${p.store}::${p.link}`
  );
  return 1 - new Set(keys).size / top.length;
}

function uniqueCommerceIdsTopN(products, n = 3) {
  const top = products.slice(0, n);
  const ids = top.map(
    (p) => p.qiNormalizedCommerce?.commerceId ?? p.qiNormalizedCommerce?.rankingIdentityKey ?? p.link
  );
  return new Set(ids).size;
}

function clusterUsesEquivalence(products) {
  const clusters = buildDealClusters(products);
  return clusters.some((c) => c.id.startsWith("eq-"));
}

function measureLatency(fn) {
  const t0 = performance.now();
  const result = fn();
  return { result, latencyMs: performance.now() - t0 };
}

function runOfflineCase(spec) {
  const query = spec.query;
  const canonicalQuery = buildCanonicalQuery(query);

  const prev = {
    enabled: process.env.QUANTAI_NORMALIZATION_ENABLED,
    mode: process.env.QUANTAI_NORMALIZATION_MODE,
    apply: process.env.QUANTAI_NORMALIZATION_APPLY,
  };

  process.env.QUANTAI_NORMALIZATION_ENABLED = "true";
  process.env.QUANTAI_NORMALIZATION_MODE = "shadow";
  process.env.QUANTAI_NORMALIZATION_APPLY = "false";

  const shadowBench = measureLatency(() => {
    const reranked = semanticRerankSearchResults([...spec.tray], query, canonicalQuery);
    return normalizeCommerceProductTray(reranked, query);
  });
  const shadow = shadowBench.result;

  process.env.QUANTAI_NORMALIZATION_MODE = "dedup";
  process.env.QUANTAI_NORMALIZATION_APPLY = "true";

  const applyBench = measureLatency(() => {
    const reranked = semanticRerankSearchResults([...spec.tray], query, canonicalQuery);
    return normalizeCommerceProductTray(reranked, query);
  });
  const applied = applyBench.result;

  process.env.QUANTAI_NORMALIZATION_ENABLED = prev.enabled ?? "false";
  process.env.QUANTAI_NORMALIZATION_MODE = prev.mode ?? "shadow";
  process.env.QUANTAI_NORMALIZATION_APPLY = prev.apply ?? "false";

  const shadowTop3Dup = top3DuplicateRate(shadow.products);
  const applyTop3Dup = top3DuplicateRate(applied.products);
  const shadowUniqueTop3 = uniqueCommerceIdsTopN(shadow.products, 3);
  const applyUniqueTop3 = uniqueCommerceIdsTopN(applied.products, 3);

  const variantKeys = new Set(
    applied.products
      .slice(0, 5)
      .map((p) => p.qiNormalizedCommerce?.variantKey)
      .filter(Boolean)
  );

  const issues = [];
  if (shadowUniqueTop3 < spec.minUniqueTop3Shadow) {
    issues.push(`shadow_top3_unique_${shadowUniqueTop3}`);
  }
  if ((spec.minDuplicateListingsDetected ?? 0) > 0 && shadow.meta.duplicateListingCount < spec.minDuplicateListingsDetected) {
    issues.push("shadow_no_duplicates_detected");
  }
  if (applyUniqueTop3 < spec.minUniqueTop3Apply) {
    issues.push(`apply_top3_unique_${applyUniqueTop3}`);
  }
  if (spec.expectVariantPreserved && variantKeys.size < 2 && spec.tray.length >= 4) {
    issues.push("variant_collapse_over_aggressive");
  }
  if (!clusterUsesEquivalence(shadow.products)) {
    issues.push("clusters_not_equivalence_backed");
  }
  if (applyTop3Dup > shadowTop3Dup) {
    issues.push("apply_worse_than_shadow");
  }

  return {
    id: spec.id,
    query,
    ok: issues.length === 0,
    issues,
    metrics: {
      shadow: {
        inputCount: shadow.meta.inputCount,
        outputCount: shadow.meta.outputCount,
        top3DuplicateRate: shadowTop3Dup,
        top3UniqueCommerceIds: shadowUniqueTop3,
        equivalenceGroups: shadow.meta.equivalenceGroupCount,
        latencyMs: shadowBench.latencyMs,
      },
      apply: {
        inputCount: applied.meta.inputCount,
        outputCount: applied.meta.outputCount,
        top3DuplicateRate: applyTop3Dup,
        top3UniqueCommerceIds: applyUniqueTop3,
        duplicateListingCount: applied.meta.duplicateListingCount,
        rankingLiftEstimate: shadowTop3Dup - applyTop3Dup,
        latencyMs: applyBench.latencyMs,
      },
      clusterEquivalenceBacked: clusterUsesEquivalence(shadow.products),
    },
  };
}

async function runLiveCase(query) {
  const url = `${BASE_URL.replace(/\/$/, "")}/api/search?q=${encodeURIComponent(query)}`;
  const t0 = performance.now();
  const res = await fetch(url);
  const latencyMs = performance.now() - t0;
  const body = await res.json();
  const products = body?.data?.products ?? [];
  const meta = body?.data?.meta ?? {};
  return {
    query,
    status: res.status,
    productCount: products.length,
    latencyMs,
    normalization: meta.normalizationProduction ?? meta.qiNormalizationMeta ?? null,
    shadowPostSemantic: meta.normalizationShadowPostSemantic ?? null,
    shadowPostControlled: meta.normalizationShadowPostControlled ?? null,
    top3DuplicateRateAfter: meta.qiNormalizationMeta?.top3DuplicateRateAfter ?? null,
  };
}

const offlineResults = GOLDEN_CASES.map(runOfflineCase);
const liveResults = [];

if (LIVE) {
  const liveQueries = ["iphone 15 pro max", "nike air force 1 white", "samsung galaxy s24 256gb"];
  for (const q of liveQueries) {
    try {
      liveResults.push(await runLiveCase(q));
    } catch (e) {
      liveResults.push({ query: q, error: e instanceof Error ? e.message : String(e) });
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: LIVE ? "offline+live" : "offline",
  flags: readNormalizationFlags(),
  summary: {
    offlineTotal: offlineResults.length,
    offlinePassed: offlineResults.filter((r) => r.ok).length,
    offlinePassRatePct: Math.round(
      (offlineResults.filter((r) => r.ok).length / offlineResults.length) * 100
    ),
    avgShadowLatencyMs: round2(
      offlineResults.reduce((s, r) => s + r.metrics.shadow.latencyMs, 0) / offlineResults.length
    ),
    avgApplyLatencyMs: round2(
      offlineResults.reduce((s, r) => s + r.metrics.apply.latencyMs, 0) / offlineResults.length
    ),
    avgRankingLift: round4(
      offlineResults.reduce((s, r) => s + r.metrics.apply.rankingLiftEstimate, 0) / offlineResults.length
    ),
  },
  offlineResults,
  liveResults,
  searchQualityMetrics: {
    top3DuplicateRateReductionTarget: 0.4,
    falseCollapseRateTarget: 0.02,
    normalizationLatencyP95TargetMs: 3,
    clusterEquivalenceCoherenceTarget: 1.0,
  },
};

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, `normalization-ranking-${Date.now()}.json`);
writeFileSync(outPath, JSON.stringify(report, null, 2));

for (const r of offlineResults) {
  console.log(`[${r.ok ? "PASS" : "FAIL"}] ${r.id}`);
  console.log(
    `  shadow top3Dup=${round4(r.metrics.shadow.top3DuplicateRate)} apply top3Dup=${round4(r.metrics.apply.top3DuplicateRate)} lift=${round4(r.metrics.apply.rankingLiftEstimate)}`
  );
  if (r.issues.length) console.log(`  issues=${r.issues.join(", ")}`);
}

console.log(`\nOffline: ${report.summary.offlinePassed}/${report.summary.offlineTotal} passed`);
console.log(`Avg shadow latency: ${report.summary.avgShadowLatencyMs}ms`);
console.log(`Avg apply latency: ${report.summary.avgApplyLatencyMs}ms`);
console.log(`Avg ranking lift (top3 dup reduction): ${report.summary.avgRankingLift}`);
console.log(`Report: ${outPath}`);

if (LIVE) {
  for (const r of liveResults) {
    console.log(`[LIVE] ${r.query} status=${r.status ?? "?"} latency=${round2(r.latencyMs ?? 0)}ms`);
  }
}

const failed = offlineResults.filter((r) => !r.ok).length;
process.exit(failed ? 1 : 0);

function round2(n) {
  return Math.round(n * 100) / 100;
}
function round4(n) {
  return Math.round(n * 10000) / 10000;
}

#!/usr/bin/env node
/**
 * Stage 1 live golden-query probe — samples real search API normalization telemetry.
 * Requires Stage 1 env on target: ENABLED=true, MODE=shadow, APPLY=false
 *
 * Usage:
 *   SEARCH_BASE_URL=http://localhost:3000 npm run test:stage1-shadow-probe
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { LIVE_GOLDEN_QUERIES } from "./lib/normalizationGoldenFixtures.mjs";

const BASE_URL = process.env.SEARCH_BASE_URL || "http://localhost:3000";
const OUT_DIR = join(process.cwd(), "docs", "architecture-audit", "stage1-shadow", "samples");
const MIN_INTERVAL_MS = Number(process.env.STAGE1_PROBE_INTERVAL_MS || 1500);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

async function probeQuery(spec) {
  const url = `${BASE_URL.replace(/\/$/, "")}/api/search?q=${encodeURIComponent(spec.query)}`;
  const t0 = Date.now();
  const res = await fetch(url);
  const latencyMs = Date.now() - t0;
  const body = await res.json();
  const meta = body?.data?.meta ?? {};
  const prod = meta.normalizationProduction ?? {};
  const shadow = meta.normalizationShadowPostControlled ?? meta.normalizationShadowTelemetry ?? {};
  const stage1 = meta.normalizationStage1 ?? {};

  return {
    id: spec.id,
    query: spec.query,
    category: spec.category,
    status: res.status,
    success: body?.success === true,
    productCount: body?.data?.products?.length ?? 0,
    latencyMs,
    normalizationEnabled: prod.enabled === true,
    mode: prod.mode ?? shadow.mode ?? null,
    apply: prod.apply ?? shadow.apply ?? null,
    top3DuplicateRateBefore: prod.top3DuplicateRateBefore ?? shadow.top3DuplicateRateBefore ?? null,
    top3DuplicateRateAfter: prod.top3DuplicateRateAfter ?? shadow.top3DuplicateRateAfter ?? null,
    projectedRankingLift: prod.projectedRankingLift ?? shadow.projectedRankingLift ?? null,
    equivalenceGroupCount: prod.equivalenceGroupCount ?? shadow.equivalenceGroupCount ?? null,
    canonicalIdentityCoverage: prod.canonicalIdentityCoverage ?? shadow.canonicalIdentityCoverage ?? null,
    merchantDiversityScoreBefore: prod.merchantDiversityScoreBefore ?? shadow.merchantDiversityScoreBefore ?? null,
    merchantDiversityScoreAfter: prod.merchantDiversityScoreAfter ?? shadow.merchantDiversityScoreAfter ?? null,
    merchantDiversityDelta: prod.merchantDiversityDelta ?? shadow.merchantDiversityDelta ?? null,
    semanticCoherenceScore: prod.semanticCoherenceScore ?? shadow.semanticCoherenceScore ?? null,
    falseCollapseIncidents: prod.falseCollapseIncidents ?? shadow.falseCollapseIncidents ?? null,
    normalizationLatencyMs: prod.latencyMs ?? shadow.latencyMs ?? null,
    rolloutReadinessScore: stage1.readinessScore ?? shadow.rolloutReadinessScore ?? null,
    rolloutReadinessGrade: stage1.readinessGrade ?? shadow.rolloutReadinessGrade ?? null,
    traySizeUnchanged: (shadow.inputCount ?? 0) === (shadow.outputCount ?? 0),
  };
}

const results = [];
for (let i = 0; i < LIVE_GOLDEN_QUERIES.length; i++) {
  const spec = LIVE_GOLDEN_QUERIES[i];
  try {
    results.push(await probeQuery(spec));
  } catch (e) {
    results.push({
      id: spec.id,
      query: spec.query,
      error: e instanceof Error ? e.message : String(e),
      success: false,
    });
  }
  if (i < LIVE_GOLDEN_QUERIES.length - 1) await sleep(MIN_INTERVAL_MS);
}

const ok = results.filter((r) => r.success && r.normalizationEnabled);
const latencies = ok.map((r) => r.latencyMs).sort((a, b) => a - b);
const normLatencies = ok.map((r) => r.normalizationLatencyMs ?? 0).filter((n) => n > 0).sort((a, b) => a - b);

const aggregate = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  queryCount: LIVE_GOLDEN_QUERIES.length,
  successCount: ok.length,
  shadowEnabledCount: ok.filter((r) => r.mode === "shadow" && r.apply === false).length,
  trayUnchangedCount: ok.filter((r) => r.traySizeUnchanged).length,
  avgTop3DuplicateRateBefore: avg(ok.map((r) => r.top3DuplicateRateBefore)),
  avgProjectedRankingLift: avg(ok.map((r) => r.projectedRankingLift)),
  avgCanonicalIdentityCoverage: avg(ok.map((r) => r.canonicalIdentityCoverage)),
  avgSemanticCoherenceScore: avg(ok.map((r) => r.semanticCoherenceScore)),
  avgMerchantDiversityDelta: avg(ok.map((r) => r.merchantDiversityDelta)),
  totalFalseCollapseIncidents: ok.reduce((s, r) => s + (r.falseCollapseIncidents ?? 0), 0),
  avgRolloutReadinessScore: avg(ok.map((r) => r.rolloutReadinessScore)),
  latency: {
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
  },
  normalizationLatency: {
    p50: percentile(normLatencies, 50),
    p95: percentile(normLatencies, 95),
    p99: percentile(normLatencies, 99),
  },
};

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, `stage1-live-probe-${Date.now()}.json`);
writeFileSync(outPath, JSON.stringify({ aggregate, results }, null, 2));

for (const r of results) {
  const flag = r.success && r.normalizationEnabled ? "OK" : "WARN";
  console.log(
    `[${flag}] ${r.id} enabled=${r.normalizationEnabled} top3Dup=${r.top3DuplicateRateBefore} projectedLift=${r.projectedRankingLift} readiness=${r.rolloutReadinessScore}`
  );
}

console.log(`\nAggregate readiness: ${round2(aggregate.avgRolloutReadinessScore)}/100`);
console.log(`Latency p95/p99: ${aggregate.latency.p95}ms / ${aggregate.latency.p99}ms`);
console.log(`Norm latency p95/p99: ${aggregate.normalizationLatency.p95}ms / ${aggregate.normalizationLatency.p99}ms`);
console.log(`Sample written: ${outPath}`);

if (!ok.length) process.exitCode = 1;

function avg(nums) {
  const v = nums.filter((n) => n != null && Number.isFinite(n));
  if (!v.length) return 0;
  return round4(v.reduce((a, b) => a + b, 0) / v.length);
}
function round2(n) {
  return Math.round(n * 100) / 100;
}
function round4(n) {
  return Math.round(n * 10000) / 10000;
}

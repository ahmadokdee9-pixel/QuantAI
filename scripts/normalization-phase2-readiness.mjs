#!/usr/bin/env node
/**
 * Phase 2 APPLY readiness — live probe + offline rollback + gate verdict.
 * Does NOT enable APPLY. Usage:
 *   SEARCH_BASE_URL=https://quant-ai-app.vercel.app npm run phase2-apply-readiness
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { LIVE_GOLDEN_QUERIES } from "./lib/normalizationGoldenFixtures.mjs";
import { GOLDEN_CASES } from "./lib/normalizationGoldenFixtures.mjs";
import {
  evaluatePhase2ApplyReadiness,
  probeMetricsFromShadow,
  verifyNormalizationApplyRollback,
} from "../lib/intelligence/normalization/index.ts";

const BASE_URL = process.env.SEARCH_BASE_URL || "http://localhost:3000";
const OUT_DIR = join(process.cwd(), "docs", "architecture-audit", "phase2-apply");
const INTERVAL_MS = Number(process.env.PHASE2_PROBE_INTERVAL_MS || 1500);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function avg(nums) {
  const v = nums.filter((n) => n != null && Number.isFinite(n));
  if (!v.length) return 0;
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10000) / 10000;
}

async function probeLive(spec) {
  const url = `${BASE_URL.replace(/\/$/, "")}/api/search?q=${encodeURIComponent(spec.query)}`;
  const t0 = Date.now();
  const res = await fetch(url);
  const searchLatencyMs = Date.now() - t0;
  const body = await res.json();
  const meta = body?.data?.meta ?? {};
  const prod = meta.normalizationProduction ?? {};
  const shadow = meta.normalizationShadowPostControlled ?? {};
  const phase2 = meta.normalizationPhase2 ?? {};
  const qi = meta.qiNormalizationMeta ?? {};

  const sample = probeMetricsFromShadow(
    {
      id: spec.id,
      query: spec.query,
      success: body?.success === true,
      normalizationEnabled: prod.enabled === true,
      mode: prod.mode ?? shadow.mode,
      apply: prod.apply ?? shadow.apply,
      rankingMutation: meta.normalizationStage1?.rankingMutation === true,
      searchLatencyMs,
      normalizationLatencyMs: prod.latencyMs ?? shadow.latencyMs,
      inputCount: shadow.inputCount ?? qi.inputCount,
      outputCount: shadow.outputCount ?? qi.outputCount,
      uniqueCommerceIdCount: prod.uniqueCommerceIdCount ?? qi.uniqueCommerceIdCount,
    },
    shadow
  );

  return {
    ...sample,
    top3DuplicateReduction:
      prod.top3DuplicateReduction ?? phase2.measuredDuplicateReduction ?? sample.top3DuplicateReduction,
    phase2,
  };
}

async function main() {
  const results = [];
  for (let i = 0; i < LIVE_GOLDEN_QUERIES.length; i++) {
    const spec = LIVE_GOLDEN_QUERIES[i];
    try {
      results.push(await probeLive(spec));
    } catch (e) {
      results.push({ id: spec.id, query: spec.query, success: false, error: String(e) });
    }
    if (i < LIVE_GOLDEN_QUERIES.length - 1) await sleep(INTERVAL_MS);
  }

  const ok = results.filter((r) => r.success && r.normalizationEnabled);
  const normLat = ok.map((r) => r.normalizationLatencyMs ?? 0).filter((n) => n > 0).sort((a, b) => a - b);
  const searchLat = ok.map((r) => r.searchLatencyMs ?? 0).filter((n) => n > 0).sort((a, b) => a - b);

  const rollbackResults = [];
  let offlineApplyTop5DriftMax = 0;
  let offlineApplyFalseCollapse = 0;
  for (const spec of GOLDEN_CASES) {
    const v = verifyNormalizationApplyRollback(spec.tray, spec.query);
    rollbackResults.push({ id: spec.id, ...v });
    offlineApplyTop5DriftMax = Math.max(offlineApplyTop5DriftMax, v.top5Drift);
    offlineApplyFalseCollapse += v.falseCollapseApply + v.falseCollapseShadow;
  }

  const metrics = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    queryCount: LIVE_GOLDEN_QUERIES.length,
    successCount: ok.length,
    shadowEnabledCount: ok.filter((r) => r.mode === "shadow" && r.apply === false).length,
    applyDisabledCount: ok.filter((r) => r.apply === false).length,
    trayUnchangedCount: ok.filter((r) => r.traySizeUnchanged).length,
    totalFalseCollapseIncidents: ok.reduce((s, r) => s + (r.falseCollapseIncidents ?? 0), 0),
    avgTop3DuplicateRateBefore: avg(ok.map((r) => r.top3DuplicateRateBefore)),
    avgTop3DuplicateRateAfter: avg(ok.map((r) => r.top3DuplicateRateAfter)),
    avgProjectedTop3DuplicateRate: avg(ok.map((r) => r.projectedTop3DuplicateRate)),
    avgTop3DuplicateReduction: avg(ok.map((r) => r.top3DuplicateReduction)),
    avgProjectedRankingLift: avg(ok.map((r) => r.projectedRankingLift)),
    avgCanonicalIdentityCoverage: avg(ok.map((r) => r.canonicalIdentityCoverage)),
    avgMerchantDiversityDelta: avg(ok.map((r) => r.merchantDiversityDelta)),
    avgSemanticCoherenceScore: avg(ok.map((r) => r.semanticCoherenceScore)),
    avgRolloutReadinessScore: avg(ok.map((r) => r.rolloutReadinessScore)),
    normalizationLatencyP50: percentile(normLat, 50),
    normalizationLatencyP95: percentile(normLat, 95),
    searchLatencyP95: percentile(searchLat, 95),
    offlineApplyTop5DriftMax,
    offlineApplyFalseCollapse,
  };

  const verdict = evaluatePhase2ApplyReadiness(metrics);

  mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = join(OUT_DIR, `phase2-readiness-${Date.now()}.json`);
  writeFileSync(jsonPath, JSON.stringify({ metrics, verdict, results, rollbackResults }, null, 2));

  const mdPath = join(OUT_DIR, "PHASE2_APPLY_READINESS_REPORT.md");
  writeFileSync(mdPath, formatReport(metrics, verdict, rollbackResults));

  console.log("\n=== Phase 2 APPLY Readiness (APPLY NOT ENABLED) ===\n");
  console.log(`Verdict: ${verdict.verdict} (${verdict.score}/100, ${verdict.passedCount}/${verdict.totalGates} gates)`);
  console.log(`False collapse (live): ${metrics.totalFalseCollapseIncidents}`);
  console.log(`Avg top-3 dup reduction (projected): ${metrics.avgTop3DuplicateReduction}`);
  console.log(`Canonical coverage avg: ${metrics.avgCanonicalIdentityCoverage}`);
  console.log(`Merchant diversity delta avg: ${metrics.avgMerchantDiversityDelta}`);
  console.log(`Norm latency p95: ${metrics.normalizationLatencyP95}ms`);
  console.log(`\n${verdict.recommendation}`);
  console.log(`\nReport: ${mdPath}`);
  console.log(`JSON: ${jsonPath}`);

  if (verdict.verdict === "BLOCKED" || !verdict.allCriticalPassed) process.exitCode = 1;
}

function formatReport(metrics, verdict, rollbackResults) {
  const gateRows = verdict.gates
    .map((g) => `| ${g.id} | ${g.passed ? "PASS" : "FAIL"} | ${g.value} | ${g.threshold} |`)
    .join("\n");

  return `# Phase 2 APPLY Readiness Report

**Generated:** ${metrics.generatedAt}  
**Base URL:** ${metrics.baseUrl ?? "—"}  
**APPLY enabled:** false (by design)  
**Ranking mutation:** false

## Safe APPLY readiness verdict

| Field | Value |
|-------|-------|
| **Verdict** | **${verdict.verdict}** |
| **Score** | ${verdict.score}/100 |
| **Critical gates** | ${verdict.allCriticalPassed ? "ALL PASS" : "FAILURES"} |
| **Recommendation** | ${verdict.recommendation} |

## Measured duplicate reduction (shadow projection)

| Metric | Value |
|--------|------:|
| Avg top-3 duplicate rate (before) | ${metrics.avgTop3DuplicateRateBefore} |
| Avg projected top-3 duplicate rate | ${metrics.avgProjectedTop3DuplicateRate} |
| **Avg measured duplicate reduction** | **${metrics.avgTop3DuplicateReduction}** |
| Avg projected ranking lift | ${metrics.avgProjectedRankingLift} |

## False collapse metrics

| Metric | Value |
|--------|------:|
| Live total falseCollapseIncidents | ${metrics.totalFalseCollapseIncidents} |
| Offline APPLY+shadow false collapses | ${metrics.offlineApplyFalseCollapse} |

## Merchant diversity impact

| Metric | Value |
|--------|------:|
| Avg merchant diversity delta | ${metrics.avgMerchantDiversityDelta} |

## Canonical identity consistency

| Metric | Value |
|--------|------:|
| Avg canonical identity coverage | ${metrics.avgCanonicalIdentityCoverage} |
| Tray unchanged (shadow) | ${metrics.trayUnchangedCount}/${metrics.successCount} |

## Ranking drift impact (offline APPLY simulation)

| Metric | Value |
|--------|------:|
| Max top-5 drift (offline) | ${metrics.offlineApplyTop5DriftMax} |
| Rollback safe (all fixtures) | ${rollbackResults.every((r) => r.rollbackSafe) ? "YES" : "NO"} |

## Latency impact

| Metric | Value |
|--------|------:|
| Normalization p50 | ${metrics.normalizationLatencyP50}ms |
| Normalization p95 | ${metrics.normalizationLatencyP95}ms |
| Search p95 | ${metrics.searchLatencyP95}ms |

## Gates

| Gate | Status | Value | Threshold |
|------|--------|------:|-----------|
${gateRows}

## Production env (shadow only — do NOT set APPLY=true)

\`\`\`
QUANTAI_NORMALIZATION_ENABLED=true
QUANTAI_NORMALIZATION_MODE=shadow
QUANTAI_NORMALIZATION_APPLY=false
QUANTAI_NORMALIZATION_SHADOW_TELEMETRY=true
\`\`\`

## Log events to monitor

- \`quantai.normalization.shadow\`
- \`quantai.normalization.shadow.audit\` (duplicate collapse monitoring)

---
*DO NOT enable production APPLY until verdict is READY_FOR_CANARY and 14-day observation completes.*
`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

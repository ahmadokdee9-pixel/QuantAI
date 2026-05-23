#!/usr/bin/env node
/**
 * Generate Stage 1 shadow rollout documentation reports from latest probe samples.
 * Usage: npm run stage1-shadow-report
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SAMPLE_DIR = join(ROOT, "docs", "architecture-audit", "stage1-shadow", "samples");
const BENCH_DIR = join(ROOT, "docs", "architecture-audit", "benchmarks");
const OUT_DIR = join(ROOT, "docs", "architecture-audit", "stage1-shadow");

function latestJson(dir, prefix) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(".json")).sort();
  if (!files.length) return null;
  return JSON.parse(readFileSync(join(dir, files[files.length - 1]), "utf8"));
}

const live = latestJson(SAMPLE_DIR, "stage1-live-probe-");
const offline = latestJson(BENCH_DIR, "normalization-ranking-");
const agg = live?.aggregate ?? {};
const generatedAt = new Date().toISOString();

mkdirSync(OUT_DIR, { recursive: true });

writeFileSync(
  join(OUT_DIR, "PRODUCTION_SHADOW_TELEMETRY_REPORT.md"),
  `# Production Shadow Telemetry Report

**Generated:** ${generatedAt}  
**Stage:** 1 — Shadow rollout (APPLY=false)  
**Status:** ${live ? "Live samples available" : "Awaiting live probe — run \`npm run test:stage1-shadow-probe\`"}

## Aggregate metrics (live golden queries)

| Metric | Value | Target |
|--------|------:|--------|
| Queries probed | ${live?.results?.length ?? 0} | ≥8 |
| Shadow enabled responses | ${agg.shadowEnabledCount ?? 0} | 100% |
| Tray unchanged (no mutation) | ${agg.trayUnchangedCount ?? 0} | 100% |
| Avg top-3 duplicate rate (before) | ${fmt(agg.avgTop3DuplicateRateBefore)} | baseline |
| Avg projected ranking lift | ${fmt(agg.avgProjectedRankingLift)} | >0 |
| Avg canonical identity coverage | ${pct(agg.avgCanonicalIdentityCoverage)} | ≥85% |
| Avg semantic coherence (top-5) | ${pct(agg.avgSemanticCoherenceScore)} | ≥80% |
| Avg merchant diversity delta | ${fmt(agg.avgMerchantDiversityDelta)} | ≥0 |
| Total false collapse incidents | ${agg.totalFalseCollapseIncidents ?? 0} | 0 |
| Avg rollout readiness score | ${fmt(agg.avgRolloutReadinessScore)}/100 | ≥65 observe, ≥85 APPLY review |

## Latency (live traffic)

| Percentile | Search total | Normalization compute |
|------------|-------------:|----------------------:|
| p50 | ${agg.latency?.p50 ?? "—"}ms | ${agg.normalizationLatency?.p50 ?? "—"}ms |
| p95 | ${agg.latency?.p95 ?? "—"}ms | ${agg.normalizationLatency?.p95 ?? "—"}ms |
| p99 | ${agg.latency?.p99 ?? "—"}ms | ${agg.normalizationLatency?.p99 ?? "—"}ms |

**Gate:** normalization p95 < 5ms; search p95 regression < 5% vs baseline.

## Telemetry channels

1. **Search response meta:** \`normalizationProduction\`, \`normalizationStage1\`, \`normalizationShadowPostControlled\`
2. **Production logs:** \`quantai.normalization.shadow\` JSON events
3. **Analytics sink:** \`quantai.normalization.shadow\` (when \`QUANTAI_ANALYTICS_SINK_URL\` set)

## Per-query samples

${live?.results?.map((r) => `- **${r.query}** — top3Dup=${fmt(r.top3DuplicateRateBefore)} projectedLift=${fmt(r.projectedRankingLift)} readiness=${r.rolloutReadinessScore ?? "—"} (${r.rolloutReadinessGrade ?? "—"})`).join("\n") ?? "_No live samples yet._"}

---
*Shadow mode: zero ranking mutation. APPLY remains false.*
`
);

writeFileSync(
  join(OUT_DIR, "REAL_TRAFFIC_NORMALIZATION_ANALYTICS.md"),
  `# Real Traffic Normalization Analytics

**Generated:** ${generatedAt}

## Tracked dimensions (Stage 1)

| Dimension | Meta field | Log field |
|-----------|------------|-----------|
| Top-3 duplicate before/after | \`top3DuplicateRateBefore/After\` | ✓ |
| Projected lift (APPLY simulation) | \`projectedRankingLift\` | ✓ |
| Equivalence groups | \`equivalenceGroupCount\` | ✓ |
| Canonical ID coverage | \`canonicalIdentityCoverage\` | ✓ |
| Merchant diversity | \`merchantDiversityScoreBefore/After\`, \`merchantDiversityDelta\` | ✓ |
| Semantic rerank coherence | \`semanticCoherenceScore\` | ✓ |
| False collapse incidents | \`falseCollapseIncidents\` | ✓ |
| Normalization latency | \`latencyMs\`, \`latencyPctOfSearch\` | ✓ |
| Rollout readiness | \`rolloutReadinessScore\`, \`rolloutReadinessGrade\` | ✓ |

## Offline benchmark baseline

| Metric | Value |
|--------|------:|
| Offline cases passed | ${offline?.summary?.offlinePassed ?? "—"}/${offline?.summary?.offlineTotal ?? "—"} |
| Avg shadow latency | ${fmt(offline?.summary?.avgShadowLatencyMs)}ms |
| Avg apply latency | ${fmt(offline?.summary?.avgApplyLatencyMs)}ms |

## Observation protocol (14 days)

1. Run \`npm run test:stage1-shadow-probe\` daily against production
2. Regenerate dashboard: \`npm run stage1-shadow-dashboard\`
3. Regenerate reports: \`npm run stage1-shadow-report\`
4. Monitor log drain for \`quantai.normalization.shadow\` p95/p99
5. Confirm \`outputCount === inputCount\` on 100% of shadow requests

---
*No embeddings · no retrieval · no ranking mutation in Stage 1.*
`
);

const readinessScore = agg.avgRolloutReadinessScore ?? 0;
const grade =
  readinessScore >= 85 ? "READY_FOR_APPLY_REVIEW" : readinessScore >= 65 ? "NEAR_READY" : readinessScore >= 40 ? "OBSERVING" : "NOT_READY";

writeFileSync(
  join(OUT_DIR, "ROLLOUT_READINESS_SCORE.md"),
  `# Rollout Readiness Score

**Generated:** ${generatedAt}  
**Current aggregate score:** ${fmt(readinessScore)}/100  
**Grade:** ${grade}

## Scoring rubric (per request, aggregated)

| Criterion | Points |
|-----------|-------:|
| Stage 1 config (shadow, apply=false) | 15 |
| Canonical identity coverage ≥85% | 15 |
| Equivalence groups detected | 10 |
| Duplicate density measurable (top3 dup ≥15%) | 10 |
| Projected ranking lift ≥0.2 | 15 |
| Zero false collapse incidents | 20 |
| Semantic coherence ≥80% | 10 |
| Normalization latency ≤5ms | 5 |
| Norm latency ≤5% of search | 5 |
| Merchant diversity non-negative delta | 5 |

## Gate for APPLY=true review

- [ ] 14-day shadow observation complete
- [ ] Aggregate readiness ≥85 for 7 consecutive days
- [ ] False collapse incidents = 0 across golden set
- [ ] Normalization p95 < 5ms
- [ ] Search p95 regression < 5%
- [ ] Projected ranking lift > 0 on ≥70% of multi-retailer queries

**Current status:** ${live ? "Collecting live evidence" : "Enable Stage 1 env and run live probe"}
`
);

writeFileSync(
  join(OUT_DIR, "APPLY_TRUE_SAFETY_CHECKLIST.md"),
  `# APPLY=true Safety Checklist

**Do not enable until all items checked.**

## Pre-conditions (Stage 1 complete)

- [ ] 14 days shadow telemetry collected
- [ ] \`npm run test:stage1-shadow-probe\` green against production
- [ ] \`npm run test:normalization-ranking\` offline 100% pass
- [ ] Dashboard shows projected lift > 0 on majority of golden queries
- [ ] Rollout readiness score ≥85 (7-day rolling avg)
- [ ] False collapse incidents = 0 on golden + live set
- [ ] Normalization p95 < 5ms; p99 < 10ms
- [ ] Search p95 regression < 5% vs pre-Stage-1 baseline

## APPLY rollout steps

1. Set \`QUANTAI_NORMALIZATION_MODE=dedup\` (not collapse initially)
2. Set \`QUANTAI_NORMALIZATION_APPLY=true\` on **canary deploy only**
3. Monitor top-3 duplicate rate ↓ ≥25%
4. Monitor tray size reduction vs duplicateListingCount
5. Emergency rollback: \`QUANTAI_NORMALIZATION_APPLY=false\` (< 60s)

## Forbidden in first APPLY wave

- [ ] Do NOT enable collapse mode yet
- [ ] Do NOT enable all layers P5–P6.9
- [ ] Do NOT add embeddings/retrieval
- [ ] Do NOT bypass semantic rerank dedup

## Sign-off required

- [ ] Search platform lead
- [ ] SRE on-call
- [ ] Architecture (QuantAI CIOS)
`
);

writeFileSync(
  join(OUT_DIR, "RANKING_SUPERIORITY_EVIDENCE_REPORT.md"),
  `# Ranking Superiority Evidence Report

**Generated:** ${generatedAt}  
**Evidence type:** Shadow projection (no ranking mutation yet)

## Hypothesis

Canonical commerce identity normalization reduces top-slot duplicate listings and improves merchant diversity **without** collapsing product variants — producing measurable search quality lift when APPLY=true.

## Evidence collected

### Duplicate suppression (projected)

| Source | Top-3 dup rate (before) | Projected after APPLY | Lift |
|--------|------------------------:|----------------------:|-----:|
| Live aggregate | ${fmt(agg.avgTop3DuplicateRateBefore)} | — | ${fmt(agg.avgProjectedRankingLift)} |
| Offline golden | ${fmt(offline?.summary?.avgRankingLift)} | — | ${fmt(offline?.summary?.avgRankingLift)} |

### Canonical ranking stability

- Canonical identity coverage (live avg): **${pct(agg.avgCanonicalIdentityCoverage)}**
- Semantic coherence top-5 (live avg): **${pct(agg.avgSemanticCoherenceScore)}**
- False collapse incidents (live total): **${agg.totalFalseCollapseIncidents ?? 0}**

### Merchant diversity

- Avg merchant diversity delta (live): **${fmt(agg.avgMerchantDiversityDelta)}**

## Conclusion (interim)

${readinessScore >= 65 ? "Evidence supports continuing Stage 1 observation — projected lift detected on commerce queries." : "Insufficient live evidence — complete Stage 1 probe against production with shadow enabled."}

**Next step:** After 14-day shadow gate passes, enable \`APPLY=true\` on dedup canary and measure **actual** top-3 lift vs this projected baseline.

---
*QuantAI proves superiority through measurement before mutation.*
`
);

console.log(`Reports written to ${OUT_DIR}/`);

function fmt(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return String(Math.round(n * 10000) / 10000);
}
function pct(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

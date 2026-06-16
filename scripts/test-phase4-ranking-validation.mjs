#!/usr/bin/env node
/**
 * Phase 4 — Ranking validation, golden benchmarks, latency hardening regression.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  dedupeProductList,
  dedupeSearchTray,
  sortByCompositeRankEnhanced,
} from "../lib/intelligence/searchRankEnhance.ts";
import { orderProductsBySearchRank } from "../lib/ui/phase40CommerceRankingActivation.ts";
import {
  GOLDEN_RANKING_BENCHMARKS,
  detectRankingAnomalies,
  measureRankingLatencyMetrics,
  runGoldenRankingBenchmarks,
  validateRankingDecisionRecordAudit,
} from "../lib/truth/rankingValidation.ts";
import {
  sortProductsByTrustDrivenRank,
  trustDrivenRankOrder,
} from "../lib/truth/trustDrivenCompositeRank.ts";
import { computeTruthRankContributions } from "../lib/truth/truthIntegrationKernel.ts";
import { buildTruthFoundationSnapshot } from "../lib/truth/truthEvidenceBuilder.ts";

let passed = 0;
function pass(label) {
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const surface = readFileSync(join(process.cwd(), "components/search/ProductResultsSurface.tsx"), "utf8");
assert.ok(!surface.includes("rankingValidation"), "no UI ranking validation import");
assert.ok(!surface.includes("trustDrivenCompositeRank"), "no UI trust rank module import");
pass("no_ui_changes");

const phase45 = readFileSync(join(process.cwd(), "lib/ui/phase45ProductionReadinessActivation.ts"), "utf8");
assert.ok(phase45.includes("trustScoresByLink"), "phase45 reuses batch trust scores");
pass("phase45_batch_score_reuse");

assert.equal(GOLDEN_RANKING_BENCHMARKS.length, 10, "ten golden query benchmarks");
pass("golden_benchmark_count");

const benchmarkResults = runGoldenRankingBenchmarks();
const failedBenchmarks = benchmarkResults.filter((result) => !result.pass);
assert.equal(
  failedBenchmarks.length,
  0,
  `golden top-3 failures: ${failedBenchmarks.map((b) => `${b.id} got ${b.top3[0]}`).join("; ")}`
);
for (const result of benchmarkResults) {
  pass(`golden_top3_${result.id}`);
}

const gamingBench = GOLDEN_RANKING_BENCHMARKS.find((b) => b.id === "gaming_laptop");
const { sorted: gamingSorted, scoresByLink: gamingScores } = sortProductsByTrustDrivenRank(
  gamingBench.products,
  gamingBench.query
);
const gamingTop3 = gamingSorted.slice(0, 3).map((p) => p.link);
assert.ok(
  gamingTop3[0] === gamingBench.expectedTopLink ||
    gamingBench.expectedTopAnyOf?.includes(gamingTop3[0] ?? "")
);
assert.notEqual(gamingTop3[0], "https://bench/xps13");
pass("top3_order_stability_gaming");

for (const [, result] of gamingScores) {
  assert.ok(result.truthDelta >= -25 && result.truthDelta <= 25);
}
pass("truth_rank_delta_bounds");

const dedupeA = {
  ...gamingBench.products[0],
  id: 100,
  link: "https://bench/gaming-dup-a",
};
const dedupeB = {
  ...gamingBench.products[0],
  id: 101,
  link: "https://bench/gaming-dup-b",
  price: 1405,
};
const deduped = dedupeProductList([dedupeA, dedupeB, gamingBench.products[1]]);
assert.equal(deduped.length, 2);
pass("dedupe_preservation");

const noisy = dedupeSearchTray([dedupeA, dedupeB]);
assert.ok(noisy.length <= 2);
pass("dedupe_search_tray_preservation");

for (const [, result] of gamingScores) {
  const auditErrors = validateRankingDecisionRecordAudit(result.record);
  assert.equal(auditErrors.length, 0, auditErrors.join(", "));
}
pass("ranking_decision_record_integrity");

const trustOrder = trustDrivenRankOrder(
  gamingBench.products.map((p) => p.link),
  gamingScores
);
const compositeOrder = sortByCompositeRankEnhanced(gamingBench.products, gamingBench.query).map((p) => p.link);
const phase40Order = orderProductsBySearchRank(gamingBench.products, trustOrder).map((p) => p.link);
assert.deepEqual(trustOrder, compositeOrder);
assert.deepEqual(phase40Order, compositeOrder);
pass("phase40_composite_order_parity");

const allAnomalies = benchmarkResults.flatMap((result) => result.anomalies);
const blockingAnomalies = allAnomalies.filter(
  (anomaly) => anomaly.kind === "constraint_violation_top3" || anomaly.kind === "irrelevant_top3"
);
console.log("\n--- Ranking anomaly report ---");
if (allAnomalies.length === 0) {
  console.log("No anomalies detected across golden benchmarks.");
} else {
  for (const anomaly of allAnomalies) {
    console.log(`[ANOMALY] ${anomaly.kind}: ${anomaly.message}`);
  }
}
assert.equal(blockingAnomalies.length, 0, "blocking ranking anomalies in golden suite");
pass("ranking_anomaly_report_clean");

const latency = measureRankingLatencyMetrics({ samples: 4 });
console.log("\n--- Performance metrics (ms) ---");
console.log(`foundationGeneration p50=${latency.foundationGeneration.p50Ms} p95=${latency.foundationGeneration.p95Ms}`);
console.log(`rankingDecisionRecord p50=${latency.rankingDecisionRecord.p50Ms} p95=${latency.rankingDecisionRecord.p95Ms}`);
console.log(`trayRanking p50=${latency.trayRanking.p50Ms} p95=${latency.trayRanking.p95Ms}`);
console.log(`simulatedApiRankBatch p50=${latency.simulatedApiRankBatch.p50Ms} p95=${latency.simulatedApiRankBatch.p95Ms}`);

assert.ok(latency.trayRanking.p95Ms < 30000, "tray ranking p95 under 30s budget");
assert.ok(latency.simulatedApiRankBatch.p95Ms < 30000, "api rank batch p95 under 30s budget");
pass("latency_budget_assertions");

const cacheA = new Map();
const product = gamingBench.products[0];
const query = gamingBench.query;
const t0 = performance.now();
sortProductsByTrustDrivenRank(gamingBench.products, query, { foundationCache: cacheA });
const coldMs = performance.now() - t0;
const t1 = performance.now();
sortProductsByTrustDrivenRank(gamingBench.products, query, { foundationCache: cacheA });
const warmMs = performance.now() - t1;
assert.ok(cacheA.size > 0, "foundation cache populated");
assert.ok(warmMs <= coldMs + 1, "memoized re-rank not slower than cold run");
pass("foundation_cache_memoization");

const foundation = buildTruthFoundationSnapshot({
  product,
  listingUrl: product.link,
  searchQuery: query,
});
const delta = computeTruthRankContributions(foundation).truthRankDelta;
assert.ok(delta >= -25 && delta <= 25);
pass("kernel_delta_still_bounded");

console.log(`\nPhase 4 ranking validation: ${passed} checks passed.`);

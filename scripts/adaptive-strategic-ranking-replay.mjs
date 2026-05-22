/**
 * P6.3 — Adaptive strategic ranking replay validation.
 */
import {
  applyControlledAdaptiveStrategicRanking,
  validateDeterministicStrategicRankingReplay,
} from "../lib/strategicRanking/strategicRankingIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV } from "./lib/strategicRankingRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;
for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV);
  const args = {
    products: row.multiObjectiveProducts,
    query: row.query,
    canonicalQuery: buildCanonicalQuery(row.query),
    governance: row.governance,
    calibration: row.calibration,
    runtime: row.runtime,
    orchestration: row.orchestration,
    memory: row.memory,
    coordination: row.coordination,
    fusion: row.fusion,
    multiObjective: row.multiObjectiveCommerce,
    intent: row.intentCognition,
    preOrderLinks: row.multiObjectiveProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };
  clearIntentMemoryStore();
  const run1 = applyControlledAdaptiveStrategicRanking(args);
  clearIntentMemoryStore();
  const run2 = applyControlledAdaptiveStrategicRanking(args);
  if (!validateDeterministicStrategicRankingReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

saveLiveObservabilityRun({ suite: "adaptive-strategic-ranking-replay", phase: "P6.3", pass: failed === 0 }, "adaptive-strategic-ranking-replay");
if (failed) process.exit(1);
console.log("\nAdaptive strategic ranking replay passed");

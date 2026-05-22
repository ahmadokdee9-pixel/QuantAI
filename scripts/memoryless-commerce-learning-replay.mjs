/**
 * P6.4 — Memoryless commerce learning replay validation.
 */
import {
  applyControlledMemorylessCommerceLearning,
  validateDeterministicMemorylessLearningReplay,
} from "../lib/memorylessLearning/memorylessLearningIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV } from "./lib/memorylessLearningRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;
for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV);
  const args = {
    products: row.strategicRankingProducts,
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
    strategic: row.adaptiveStrategicRanking,
    preOrderLinks: row.strategicRankingProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };
  clearIntentMemoryStore();
  const run1 = applyControlledMemorylessCommerceLearning(args);
  clearIntentMemoryStore();
  const run2 = applyControlledMemorylessCommerceLearning(args);
  if (!validateDeterministicMemorylessLearningReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

saveLiveObservabilityRun({ suite: "memoryless-commerce-learning-replay", phase: "P6.4", pass: failed === 0 }, "memoryless-commerce-learning-replay");
if (failed) process.exit(1);
console.log("\nMemoryless commerce learning replay passed");

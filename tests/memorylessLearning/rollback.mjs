/**
 * P6.4 — Memoryless learning rollback recovery unit tests.
 */
import { applyControlledMemorylessCommerceLearning } from "../../lib/memorylessLearning/memorylessLearningIntelligence.ts";
import { clearIntentMemoryStore } from "../../lib/intent/intentMemory.ts";
import { MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV } from "../../scripts/lib/memorylessLearningRunner.mjs";
import { runIntentEvaluationPartition } from "../../scripts/lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "../../scripts/lib/intentLiveObservabilityPartitions.mjs";

let failed = 0;
clearIntentMemoryStore();
const row = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], {
  ...MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV,
  MEMORYLESS_COMMERCE_LEARNING_EMERGENCY_SHUTDOWN: "true",
});

if (row.memorylessCommerceLearning.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown should block mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

const preLinks = row.strategicRankingProducts.map((p) => p.link || p.title).join("|");
const postLinks = row.memorylessLearningProducts.map((p) => p.link || p.title).join("|");
if (preLinks !== postLinks) {
  failed += 1;
  console.error("FAIL rollback did not preserve order");
} else {
  console.log("OK rollback preserves pre-learning ranking");
}

if (failed) process.exit(1);
console.log("\nMemoryless learning rollback recovery tests passed");

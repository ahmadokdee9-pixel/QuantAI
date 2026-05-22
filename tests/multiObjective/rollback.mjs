/**
 * P6.2 — Multi-objective rollback recovery unit tests.
 */
import { applyControlledMultiObjectiveCommerce } from "../../lib/multiObjective/multiObjectiveIntelligence.ts";
import { clearIntentMemoryStore } from "../../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../../lib/search/canonicalQuery.ts";
import { MULTI_OBJECTIVE_BOUNDED_ENV } from "../../scripts/lib/multiObjectiveRunner.mjs";
import { runIntentEvaluationPartition } from "../../scripts/lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "../../scripts/lib/intentLiveObservabilityPartitions.mjs";

let failed = 0;
clearIntentMemoryStore();
const row = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], {
  ...MULTI_OBJECTIVE_BOUNDED_ENV,
  MULTI_OBJECTIVE_COMMERCE_EMERGENCY_SHUTDOWN: "true",
});

if (row.multiObjectiveCommerce.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown should block mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

const preLinks = row.intentCognitionProducts.map((p) => p.link || p.title).join("|");
const postLinks = row.multiObjectiveProducts.map((p) => p.link || p.title).join("|");
if (preLinks !== postLinks) {
  failed += 1;
  console.error("FAIL rollback did not preserve order");
} else {
  console.log("OK rollback preserves pre-multi-objective ranking");
}

if (failed) process.exit(1);
console.log("\nMulti-objective rollback recovery tests passed");

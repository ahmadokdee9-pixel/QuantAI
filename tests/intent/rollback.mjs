/**
 * P6.1 — Rollback recovery unit tests.
 */
import { applyControlledIntentCognition } from "../../lib/intent/intentIntelligence.ts";
import { clearIntentMemoryStore } from "../../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../../lib/search/canonicalQuery.ts";
import { INTENT_COGNITION_BOUNDED_ENV } from "../../scripts/lib/intentRunner.mjs";
import { runIntentEvaluationPartition } from "../../scripts/lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "../../scripts/lib/intentLiveObservabilityPartitions.mjs";

let failed = 0;
clearIntentMemoryStore();
const row = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], {
  ...INTENT_COGNITION_BOUNDED_ENV,
  INTENT_COGNITION_EMERGENCY_SHUTDOWN: "true",
});

if (row.intentCognition.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown should block mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

const preLinks = row.cognitionProducts.map((p) => p.link || p.title).join("|");
const postLinks = row.intentCognitionProducts.map((p) => p.link || p.title).join("|");
if (preLinks !== postLinks) {
  failed += 1;
  console.error("FAIL rollback did not preserve order");
} else {
  console.log("OK rollback preserves pre-intent ranking");
}

if (failed) process.exit(1);
console.log("\nRollback recovery tests passed");

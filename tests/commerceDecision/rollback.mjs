/**
 * P6.6 — Commerce decision rollback recovery unit tests.
 */
import { clearIntentMemoryStore } from "../../lib/intent/intentMemory.ts";
import { COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV } from "../../scripts/lib/commerceDecisionRunner.mjs";
import { runIntentEvaluationPartition } from "../../scripts/lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "../../scripts/lib/intentLiveObservabilityPartitions.mjs";

let failed = 0;
clearIntentMemoryStore();
const row = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], {
  ...COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV,
  COMMERCE_DECISION_INTELLIGENCE_EMERGENCY_SHUTDOWN: "true",
});

if (row.commerceDecisionIntelligence.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown should block mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

const preLinks = row.marketRealityProducts.map((p) => p.link || p.title).join("|");
const postLinks = row.commerceDecisionProducts.map((p) => p.link || p.title).join("|");
if (preLinks !== postLinks) {
  failed += 1;
  console.error("FAIL rollback did not preserve order");
} else {
  console.log("OK rollback preserves pre-decision ranking");
}

if (failed) process.exit(1);
console.log("\nCommerce decision rollback recovery tests passed");

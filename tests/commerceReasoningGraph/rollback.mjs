/**
 * P6.7 — Commerce reasoning graph rollback recovery unit tests.
 */
import { clearIntentMemoryStore } from "../../lib/intent/intentMemory.ts";
import { AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV } from "../../scripts/lib/commerceReasoningGraphRunner.mjs";
import { runIntentEvaluationPartition } from "../../scripts/lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "../../scripts/lib/intentLiveObservabilityPartitions.mjs";

let failed = 0;
clearIntentMemoryStore();
const row = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], {
  ...AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV,
  AUTONOMOUS_COMMERCE_REASONING_GRAPH_EMERGENCY_SHUTDOWN: "true",
});

if (row.autonomousCommerceReasoningGraph.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown should block mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

const preLinks = row.commerceDecisionProducts.map((p) => p.link || p.title).join("|");
const postLinks = row.reasoningGraphProducts.map((p) => p.link || p.title).join("|");
if (preLinks !== postLinks) {
  failed += 1;
  console.error("FAIL rollback did not preserve order");
} else {
  console.log("OK rollback preserves pre-graph ranking");
}

if (failed) process.exit(1);
console.log("\nCommerce reasoning graph rollback recovery tests passed");

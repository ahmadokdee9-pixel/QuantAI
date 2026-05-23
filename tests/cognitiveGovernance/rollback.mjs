/**
 * P6.8 — Unified cognitive governance rollback recovery unit tests.
 */
import { clearIntentMemoryStore } from "../../lib/intent/intentMemory.ts";
import { UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV } from "../../scripts/lib/cognitiveGovernanceRunner.mjs";
import { runIntentEvaluationPartition } from "../../scripts/lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "../../scripts/lib/intentLiveObservabilityPartitions.mjs";

let failed = 0;
clearIntentMemoryStore();
const row = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], {
  ...UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV,
  COGNITIVE_GOVERNANCE_EMERGENCY_SHUTDOWN: "true",
});

if (row.unifiedCognitiveGovernance.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown should block mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

const preLinks = row.reasoningGraphProducts.map((p) => p.link || p.title).join("|");
const postLinks = row.cognitiveGovernanceProducts.map((p) => p.link || p.title).join("|");
if (preLinks !== postLinks) {
  failed += 1;
  console.error("FAIL rollback did not preserve order");
} else {
  console.log("OK rollback preserves pre-governance ranking");
}

if (failed) process.exit(1);
console.log("\nUnified cognitive governance rollback recovery tests passed");

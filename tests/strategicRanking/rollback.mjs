/**
 * P6.3 — Strategic ranking rollback recovery unit tests.
 */
import { applyControlledAdaptiveStrategicRanking } from "../../lib/strategicRanking/strategicRankingIntelligence.ts";
import { clearIntentMemoryStore } from "../../lib/intent/intentMemory.ts";
import { ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV } from "../../scripts/lib/strategicRankingRunner.mjs";
import { runIntentEvaluationPartition } from "../../scripts/lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "../../scripts/lib/intentLiveObservabilityPartitions.mjs";

let failed = 0;
clearIntentMemoryStore();
const row = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], {
  ...ADAPTIVE_STRATEGIC_RANKING_BOUNDED_ENV,
  ADAPTIVE_STRATEGIC_RANKING_EMERGENCY_SHUTDOWN: "true",
});

if (row.adaptiveStrategicRanking.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown should block mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

const preLinks = row.multiObjectiveProducts.map((p) => p.link || p.title).join("|");
const postLinks = row.strategicRankingProducts.map((p) => p.link || p.title).join("|");
if (preLinks !== postLinks) {
  failed += 1;
  console.error("FAIL rollback did not preserve order");
} else {
  console.log("OK rollback preserves pre-strategic ranking");
}

if (failed) process.exit(1);
console.log("\nStrategic ranking rollback recovery tests passed");

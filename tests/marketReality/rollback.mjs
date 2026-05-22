/**
 * P6.5 — Market reality rollback recovery unit tests.
 */
import { clearIntentMemoryStore } from "../../lib/intent/intentMemory.ts";
import { MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV } from "../../scripts/lib/marketRealityRunner.mjs";
import { runIntentEvaluationPartition } from "../../scripts/lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "../../scripts/lib/intentLiveObservabilityPartitions.mjs";

let failed = 0;
clearIntentMemoryStore();
const row = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], {
  ...MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV,
  MARKET_REALITY_INTELLIGENCE_EMERGENCY_SHUTDOWN: "true",
});

if (row.marketRealityIntelligence.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown should block mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

const preLinks = row.memorylessLearningProducts.map((p) => p.link || p.title).join("|");
const postLinks = row.marketRealityProducts.map((p) => p.link || p.title).join("|");
if (preLinks !== postLinks) {
  failed += 1;
  console.error("FAIL rollback did not preserve order");
} else {
  console.log("OK rollback preserves pre-reality ranking");
}

if (failed) process.exit(1);
console.log("\nMarket reality rollback recovery tests passed");

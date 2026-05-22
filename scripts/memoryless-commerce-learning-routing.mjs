/**
 * P6.4 — Memoryless commerce learning routing validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV, runMemorylessLearningPartitions } from "./lib/memorylessLearningRunner.mjs";

const VALID_LANES = new Set([
  "hold",
  "stabilize",
  "reinforce",
  "drift-check",
  "fatigue-check",
  "confidence-check",
  "oscillation-check",
  "trust-check",
  "conversion-check",
  "continuity-safe",
  "replay-protect",
]);

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, memorylessCommerceLearning: m } of runMemorylessLearningPartitions(MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV)) {
  const ok = VALID_LANES.has(m.routingLane) && m.analytics.replayIntegrityAnalytics >= 60 && m.monitoring.replayIntegrityValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${m.routingLane}`);
  } else {
    console.log(`OK ${trayId} lane=${m.routingLane} graph=${m.graphExecutionHash.slice(0, 20)}`);
  }
}

saveLiveObservabilityRun({ suite: "memoryless-commerce-learning-routing", phase: "P6.4", pass: failed === 0 }, "memoryless-commerce-learning-routing");
if (failed) process.exit(1);
console.log("\nMemoryless commerce learning routing passed");

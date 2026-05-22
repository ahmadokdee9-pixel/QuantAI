/**
 * P6.4 — Memoryless commerce learning drift validation.
 */
import { MEMORYLESS_LEARNING_MAX_DELTA, MEMORYLESS_LEARNING_MAX_DRIFT } from "../lib/memorylessLearning/memorylessLearningFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV, runMemorylessLearningPartitions } from "./lib/memorylessLearningRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, memorylessCommerceLearning: m } of runMemorylessLearningPartitions(MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV)) {
  const pass = m.learningDelta <= MEMORYLESS_LEARNING_MAX_DELTA && m.analytics.topDriftCount <= MEMORYLESS_LEARNING_MAX_DRIFT;
  if (!pass) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: m.learningDelta, topDrift: m.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${m.learningDelta} topDrift=${m.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "memoryless-commerce-learning-drift", phase: "P6.4", pass: failed === 0 }, "memoryless-commerce-learning-drift");
if (failed) process.exit(1);
console.log("\nMemoryless commerce learning drift passed");

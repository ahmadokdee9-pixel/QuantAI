/**
 * P6.4 — Memoryless commerce learning confidence validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV, runMemorylessLearningPartitions } from "./lib/memorylessLearningRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, memorylessCommerceLearning: m } of runMemorylessLearningPartitions(MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV)) {
  const ok = m.learningConfidence >= 0.3 && m.learningConfidence <= 1;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} confidence=${m.learningConfidence}`);
  } else {
    console.log(`OK ${trayId} confidence=${m.learningConfidence}`);
  }
}

saveLiveObservabilityRun({ suite: "memoryless-commerce-learning-confidence", phase: "P6.4", pass: failed === 0 }, "memoryless-commerce-learning-confidence");
if (failed) process.exit(1);
console.log("\nMemoryless commerce learning confidence passed");

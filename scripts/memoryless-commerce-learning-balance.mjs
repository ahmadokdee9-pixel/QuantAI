/**
 * P6.4 — Memoryless commerce learning balance validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV, runMemorylessLearningPartitions } from "./lib/memorylessLearningRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, memorylessCommerceLearning: m } of runMemorylessLearningPartitions(MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV)) {
  const ok =
    m.continuityReinforcement >= 0 &&
    m.analytics.topDriftCount <= 1 &&
    m.monitoring.continuityValid &&
    m.monitoring.replayIntegrityValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { continuity: m.continuityReinforcement, drift: m.rankingDriftScore });
  } else {
    console.log(`OK ${trayId} continuity=${m.continuityReinforcement} harmony=${m.analytics.harmonyAnalytics}`);
  }
}

saveLiveObservabilityRun({ suite: "memoryless-commerce-learning-balance", phase: "P6.4", pass: failed === 0 }, "memoryless-commerce-learning-balance");
if (failed) process.exit(1);
console.log("\nMemoryless commerce learning balance passed");

/**
 * P6.4 — Memoryless commerce learning stability validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV, runMemorylessLearningPartitions } from "./lib/memorylessLearningRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, memorylessCommerceLearning: m } of runMemorylessLearningPartitions(MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV)) {
  const ok = m.learningScore >= 30 && m.learningConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${m.learningScore}`);
  } else {
    console.log(`OK ${trayId} score=${m.learningScore} confidence=${m.learningConfidence}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = { ...MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV, MEMORYLESS_COMMERCE_LEARNING_EMERGENCY_SHUTDOWN: "true" };
if (runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv).memorylessCommerceLearning.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "memoryless-commerce-learning-stability", phase: "P6.4", pass: failed === 0 }, "memoryless-commerce-learning-stability");
if (failed) process.exit(1);
console.log("\nMemoryless commerce learning stability passed");

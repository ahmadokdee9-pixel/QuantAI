/**
 * P6.4 — Memoryless commerce learning integrity validation.
 */
import {
  isMemorylessCommerceLearningEnabled,
  isMemorylessCommerceLearningEnvironmentAllowed,
  isMemorylessCommerceLearningMutationEnabled,
} from "../lib/memorylessLearning/memorylessLearningIntelligence.ts";
import { MEMORYLESS_LEARNING_MAX_DELTA } from "../lib/memorylessLearning/memorylessLearningFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV, runMemorylessLearningPartitions } from "./lib/memorylessLearningRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, memorylessCommerceLearning: m } of runMemorylessLearningPartitions(MEMORYLESS_COMMERCE_LEARNING_BOUNDED_ENV)) {
  const ok = m.learningDelta <= MEMORYLESS_LEARNING_MAX_DELTA && m.monitoring.crossLearningBalanceValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: m.learningDelta });
  } else {
    console.log(`OK ${trayId} delta=${m.learningDelta}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.MEMORYLESS_COMMERCE_LEARNING_ENABLED = "true";
process.env.MEMORYLESS_COMMERCE_LEARNING_MODE = "bounded-learning";
delete process.env.MEMORYLESS_COMMERCE_LEARNING_PROD_APPLY;
delete process.env.MEMORYLESS_COMMERCE_LEARNING_CANARY_APPLY;
const blocked = isMemorylessCommerceLearningEnabled() && !isMemorylessCommerceLearningMutationEnabled() && !isMemorylessCommerceLearningEnvironmentAllowed();
Object.assign(process.env, saved);
if (!blocked) {
  failed += 1;
  console.error("FAIL production blocked without opt-in");
} else {
  console.log("OK production blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "memoryless-commerce-learning-integrity", phase: "P6.4", pass: failed === 0 }, "memoryless-commerce-learning-integrity");
if (failed) process.exit(1);
console.log("\nMemoryless commerce learning integrity passed");

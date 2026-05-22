/**
 * P6.2 — Multi-objective commerce stability validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MULTI_OBJECTIVE_BOUNDED_ENV, runMultiObjectivePartitions } from "./lib/multiObjectiveRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, multiObjectiveCommerce: m } of runMultiObjectivePartitions(MULTI_OBJECTIVE_BOUNDED_ENV)) {
  const ok = m.multiObjectiveScore >= 30 && m.multiObjectiveConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${m.multiObjectiveScore}`);
  } else {
    console.log(`OK ${trayId} score=${m.multiObjectiveScore} confidence=${m.multiObjectiveConfidence}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = { ...MULTI_OBJECTIVE_BOUNDED_ENV, MULTI_OBJECTIVE_COMMERCE_EMERGENCY_SHUTDOWN: "true" };
if (runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv).multiObjectiveCommerce.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "multi-objective-stability", phase: "P6.2", pass: failed === 0 }, "multi-objective-stability");
if (failed) process.exit(1);
console.log("\nMulti-objective commerce stability passed");

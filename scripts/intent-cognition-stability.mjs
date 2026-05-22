/**
 * P6.1 — Intent cognition stability validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { INTENT_COGNITION_BOUNDED_ENV, runIntentCognitionPartitions } from "./lib/intentRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, intentCognition: i } of runIntentCognitionPartitions(INTENT_COGNITION_BOUNDED_ENV)) {
  const ok = i.intentScore >= 30 && i.intentConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${i.intentScore}`);
  } else {
    console.log(`OK ${trayId} score=${i.intentScore} confidence=${i.intentConfidence}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = { ...INTENT_COGNITION_BOUNDED_ENV, INTENT_COGNITION_EMERGENCY_SHUTDOWN: "true" };
if (runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv).intentCognition.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "intent-cognition-stability", phase: "P6.1", pass: failed === 0 }, "intent-cognition-stability");
if (failed) process.exit(1);
console.log("\nIntent cognition stability passed");

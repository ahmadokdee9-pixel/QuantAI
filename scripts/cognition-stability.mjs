/**
 * P6.0 — Cognition stability + emergency shutdown.
 * Usage: npm run test:cognition-stability
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COGNITION_BOUNDED_ENV, runCognitionPartitions } from "./lib/cognitionRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runCognitionPartitions(COGNITION_BOUNDED_ENV);

for (const { trayId, cognitionEngine: c } of rows) {
  const ok = c.cognitionScore >= 30 && c.cognitionConfidence >= 0.3 && c.cognitionStability >= 0.25;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${c.cognitionScore} confidence=${c.cognitionConfidence} stability=${c.cognitionStability}`);
  } else {
    console.log(`OK ${trayId} score=${c.cognitionScore} stability=${c.cognitionStability}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = { ...COGNITION_BOUNDED_ENV, COGNITION_ENGINE_EMERGENCY_SHUTDOWN: "true" };
const shutdownRow = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv);
if (shutdownRow.cognitionEngine.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "cognition-stability", phase: "P6.0", pass: failed === 0 }, "cognition-stability");

if (failed) process.exit(1);
console.log("\nCognition engine stability passed");

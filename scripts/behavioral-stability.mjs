/**
 * P5.9 — Behavioral stability + emergency shutdown.
 * Usage: npm run test:behavioral-stability
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { BEHAVIORAL_BOUNDED_ENV, runBehavioralPartitions } from "./lib/behavioralRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runBehavioralPartitions(BEHAVIORAL_BOUNDED_ENV);

for (const { trayId, behavioralCommerce: b } of rows) {
  const ok = b.behavioralScore >= 30 && b.behavioralConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${b.behavioralScore} confidence=${b.behavioralConfidence}`);
  } else {
    console.log(`OK ${trayId} score=${b.behavioralScore} confidence=${b.behavioralConfidence}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = { ...BEHAVIORAL_BOUNDED_ENV, BEHAVIORAL_COMMERCE_EMERGENCY_SHUTDOWN: "true" };
const shutdownRow = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv);
if (shutdownRow.behavioralCommerce.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "behavioral-stability", phase: "P5.9", pass: failed === 0 }, "behavioral-stability");

if (failed) process.exit(1);
console.log("\nBehavioral commerce stability passed");

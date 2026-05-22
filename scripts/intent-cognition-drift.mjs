/**
 * P6.1 — Intent cognition drift validation.
 */
import { INTENT_COGNITION_MAX_DELTA, INTENT_COGNITION_MAX_DRIFT } from "../lib/intent/intentFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { INTENT_COGNITION_BOUNDED_ENV, runIntentCognitionPartitions } from "./lib/intentRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, intentCognition: i } of runIntentCognitionPartitions(INTENT_COGNITION_BOUNDED_ENV)) {
  const pass = i.intentDelta <= INTENT_COGNITION_MAX_DELTA && i.analytics.topDriftCount <= INTENT_COGNITION_MAX_DRIFT;
  if (!pass) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: i.intentDelta, topDrift: i.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${i.intentDelta} topDrift=${i.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "intent-cognition-drift", phase: "P6.1", pass: failed === 0 }, "intent-cognition-drift");
if (failed) process.exit(1);
console.log("\nIntent cognition drift passed");

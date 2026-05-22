/**
 * P6.1 — Intent cognition confidence validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { INTENT_COGNITION_BOUNDED_ENV, runIntentCognitionPartitions } from "./lib/intentRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, intentCognition: i } of runIntentCognitionPartitions(INTENT_COGNITION_BOUNDED_ENV)) {
  const ok = i.intentConfidence >= 0.3 && i.intentConfidence <= 1 && !i.monitoring.readinessInflation;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} confidence=${i.intentConfidence}`);
  } else {
    console.log(`OK ${trayId} confidence=${i.intentConfidence}`);
  }
}

saveLiveObservabilityRun({ suite: "intent-cognition-confidence", phase: "P6.1", pass: failed === 0 }, "intent-cognition-confidence");
if (failed) process.exit(1);
console.log("\nIntent cognition confidence passed");

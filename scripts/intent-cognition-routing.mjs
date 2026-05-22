/**
 * P6.1 — Intent cognition routing validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { INTENT_COGNITION_BOUNDED_ENV, runIntentCognitionPartitions } from "./lib/intentRunner.mjs";

const VALID_LANES = new Set([
  "hold",
  "stabilize",
  "reinforce",
  "compare",
  "strategic-balance",
  "conversion-check",
  "momentum-check",
  "behavior-check",
  "contradiction-check",
  "intent-safe",
  "replay-protect",
]);

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, intentCognition: i } of runIntentCognitionPartitions(INTENT_COGNITION_BOUNDED_ENV)) {
  const ok = VALID_LANES.has(i.routingLane) && i.analytics.replayIntegrityAnalytics >= 60 && i.monitoring.replayIntegrityValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${i.routingLane}`);
  } else {
    console.log(`OK ${trayId} lane=${i.routingLane} graph=${i.graphExecutionHash.slice(0, 20)}`);
  }
}

saveLiveObservabilityRun({ suite: "intent-cognition-routing", phase: "P6.1", pass: failed === 0 }, "intent-cognition-routing");
if (failed) process.exit(1);
console.log("\nIntent cognition routing passed");

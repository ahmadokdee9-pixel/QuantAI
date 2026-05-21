/**
 * P6.0 — Cognition drift ≤ 1.0.
 * Usage: npm run test:cognition-drift
 */
import { COGNITION_MAX_DELTA, COGNITION_MAX_DRIFT } from "../lib/cognition/cognitionFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COGNITION_BOUNDED_ENV, runCognitionPartitions } from "./lib/cognitionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runCognitionPartitions(COGNITION_BOUNDED_ENV);

for (const { trayId, cognitionEngine: c } of rows) {
  const pass = c.cognitionDelta <= COGNITION_MAX_DELTA && c.analytics.topDriftCount <= COGNITION_MAX_DRIFT;
  if (!pass) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: c.cognitionDelta, topDrift: c.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${c.cognitionDelta} topDrift=${c.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "cognition-drift", phase: "P6.0", pass: failed === 0 }, "cognition-drift");

if (failed) process.exit(1);
console.log("\nCognition engine drift passed");

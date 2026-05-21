/**
 * P6.0 — Cognition confidence stability.
 * Usage: npm run test:cognition-confidence
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COGNITION_BOUNDED_ENV, runCognitionPartitions } from "./lib/cognitionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runCognitionPartitions(COGNITION_BOUNDED_ENV);

for (const { trayId, cognitionEngine: c } of rows) {
  const ok =
    c.cognitionConfidence >= 0.3 &&
    c.cognitionConfidence <= 1 &&
    c.analytics.conversionProbabilityAnalytics >= 0 &&
    !c.monitoring.conversionInflation;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} confidence=${c.cognitionConfidence}`);
  } else {
    console.log(`OK ${trayId} confidence=${c.cognitionConfidence}`);
  }
}

saveLiveObservabilityRun({ suite: "cognition-confidence", phase: "P6.0", pass: failed === 0 }, "cognition-confidence");

if (failed) process.exit(1);
console.log("\nCognition engine confidence passed");

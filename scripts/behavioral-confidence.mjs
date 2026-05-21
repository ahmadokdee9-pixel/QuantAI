/**
 * P5.9 — Behavioral confidence stability.
 * Usage: npm run test:behavioral-confidence
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { BEHAVIORAL_BOUNDED_ENV, runBehavioralPartitions } from "./lib/behavioralRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runBehavioralPartitions(BEHAVIORAL_BOUNDED_ENV);

for (const { trayId, behavioralCommerce: b } of rows) {
  const ok =
    b.behavioralConfidence >= 0.3 &&
    b.behavioralConfidence <= 1 &&
    b.analytics.aggregateAnalytics >= 0 &&
    !b.monitoring.frictionInflation;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} confidence=${b.behavioralConfidence}`);
  } else {
    console.log(`OK ${trayId} confidence=${b.behavioralConfidence}`);
  }
}

saveLiveObservabilityRun({ suite: "behavioral-confidence", phase: "P5.9", pass: failed === 0 }, "behavioral-confidence");

if (failed) process.exit(1);
console.log("\nBehavioral commerce confidence passed");

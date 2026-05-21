/**
 * P5.9 — Behavioral drift ≤ 1.0.
 * Usage: npm run test:behavioral-drift
 */
import { BEHAVIORAL_MAX_DELTA, BEHAVIORAL_MAX_DRIFT } from "../lib/behavioral/behavioralFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { BEHAVIORAL_BOUNDED_ENV, runBehavioralPartitions } from "./lib/behavioralRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runBehavioralPartitions(BEHAVIORAL_BOUNDED_ENV);

for (const { trayId, behavioralCommerce: b } of rows) {
  const pass = b.behavioralDelta <= BEHAVIORAL_MAX_DELTA && b.analytics.topDriftCount <= BEHAVIORAL_MAX_DRIFT;
  if (!pass) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: b.behavioralDelta, topDrift: b.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${b.behavioralDelta} topDrift=${b.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "behavioral-drift", phase: "P5.9", pass: failed === 0 }, "behavioral-drift");

if (failed) process.exit(1);
console.log("\nBehavioral commerce drift passed");

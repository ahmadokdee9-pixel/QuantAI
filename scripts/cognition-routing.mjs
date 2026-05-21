/**
 * P6.0 — Cognition routing lanes validation.
 * Usage: npm run test:cognition-routing
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COGNITION_BOUNDED_ENV, runCognitionPartitions } from "./lib/cognitionRunner.mjs";

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
  "cognition-safe",
  "replay-protect",
]);

clearIntentMemoryStore();
let failed = 0;
const rows = runCognitionPartitions(COGNITION_BOUNDED_ENV);

for (const { trayId, cognitionEngine: c } of rows) {
  const replayOk = c.analytics.replayIntegrityAnalytics >= 60 && c.monitoring.replayIntegrityValid;
  const ok = VALID_LANES.has(c.routingLane) && replayOk;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${c.routingLane} replay=${c.analytics.replayIntegrityAnalytics}`);
  } else {
    console.log(`OK ${trayId} lane=${c.routingLane} replay=${c.analytics.replayIntegrityAnalytics} graph=${c.graphExecutionHash.slice(0, 20)}`);
  }
}

saveLiveObservabilityRun({ suite: "cognition-routing", phase: "P6.0", pass: failed === 0 }, "cognition-routing");

if (failed) process.exit(1);
console.log("\nCognition engine routing passed");

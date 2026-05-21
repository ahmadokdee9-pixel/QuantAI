/**
 * P5.9 — Behavioral routing lanes validation.
 * Usage: npm run test:behavioral-routing
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { BEHAVIORAL_BOUNDED_ENV, runBehavioralPartitions } from "./lib/behavioralRunner.mjs";

const VALID_LANES = new Set([
  "hold",
  "stabilize",
  "advisory-only",
  "friction-check",
  "hesitation-check",
  "comparison-fatigue",
  "trust-momentum",
  "conversion-ready",
  "replay-protect",
  "commerce-safe",
]);

clearIntentMemoryStore();
let failed = 0;
const rows = runBehavioralPartitions(BEHAVIORAL_BOUNDED_ENV);

for (const { trayId, behavioralCommerce: b } of rows) {
  const replayOk = b.analytics.replayIntegrityAnalytics >= 60 && b.monitoring.replayIntegrityValid;
  const ok = VALID_LANES.has(b.routingLane) && replayOk;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${b.routingLane} replay=${b.analytics.replayIntegrityAnalytics}`);
  } else {
    console.log(`OK ${trayId} lane=${b.routingLane} replay=${b.analytics.replayIntegrityAnalytics} graph=${b.graphExecutionHash.slice(0, 20)}`);
  }
}

saveLiveObservabilityRun({ suite: "behavioral-routing", phase: "P5.9", pass: failed === 0 }, "behavioral-routing");

if (failed) process.exit(1);
console.log("\nBehavioral commerce routing passed");

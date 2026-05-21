/**
 * P5.3 — Coordination drift ≤ 1.25.
 * Usage: npm run test:intent-coordination-drift
 */
import { INTENT_COORDINATION_MAX_DELTA, INTENT_COORDINATION_MAX_DRIFT } from "../lib/intent/intentCoordinationFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COORDINATION_BOUNDED_ENV, runCoordinationPartitions } from "./lib/intentCoordinationRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runCoordinationPartitions(COORDINATION_BOUNDED_ENV);

for (const { trayId, coordination: c } of rows) {
  const ok =
    c.coordinationDelta <= INTENT_COORDINATION_MAX_DELTA &&
    c.analytics.topDriftCount <= INTENT_COORDINATION_MAX_DRIFT &&
    !c.monitoring.routingDrift;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: c.coordinationDelta, topDrift: c.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${c.coordinationDelta} topDrift=${c.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "intent-coordination-drift", phase: "P5.3", pass: failed === 0 }, "intent-coordination-drift");

if (failed) process.exit(1);
console.log("\nIntent coordination drift passed");

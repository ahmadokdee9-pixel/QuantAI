/**
 * P6.2 — Multi-objective commerce routing validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MULTI_OBJECTIVE_BOUNDED_ENV, runMultiObjectivePartitions } from "./lib/multiObjectiveRunner.mjs";

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
  "objective-safe",
  "replay-protect",
]);

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, multiObjectiveCommerce: m } of runMultiObjectivePartitions(MULTI_OBJECTIVE_BOUNDED_ENV)) {
  const ok = VALID_LANES.has(m.routingLane) && m.analytics.replayIntegrityAnalytics >= 60 && m.monitoring.replayIntegrityValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${m.routingLane}`);
  } else {
    console.log(`OK ${trayId} lane=${m.routingLane} graph=${m.graphExecutionHash.slice(0, 20)}`);
  }
}

saveLiveObservabilityRun({ suite: "multi-objective-routing", phase: "P6.2", pass: failed === 0 }, "multi-objective-routing");
if (failed) process.exit(1);
console.log("\nMulti-objective commerce routing passed");

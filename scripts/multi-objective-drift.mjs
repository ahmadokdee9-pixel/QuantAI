/**
 * P6.2 — Multi-objective commerce drift validation.
 */
import { MULTI_OBJECTIVE_MAX_DELTA, MULTI_OBJECTIVE_MAX_DRIFT } from "../lib/multiObjective/multiObjectiveFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MULTI_OBJECTIVE_BOUNDED_ENV, runMultiObjectivePartitions } from "./lib/multiObjectiveRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, multiObjectiveCommerce: m } of runMultiObjectivePartitions(MULTI_OBJECTIVE_BOUNDED_ENV)) {
  const pass = m.multiObjectiveDelta <= MULTI_OBJECTIVE_MAX_DELTA && m.analytics.topDriftCount <= MULTI_OBJECTIVE_MAX_DRIFT;
  if (!pass) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: m.multiObjectiveDelta, topDrift: m.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${m.multiObjectiveDelta} topDrift=${m.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "multi-objective-drift", phase: "P6.2", pass: failed === 0 }, "multi-objective-drift");
if (failed) process.exit(1);
console.log("\nMulti-objective commerce drift passed");

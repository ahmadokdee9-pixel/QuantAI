/**
 * P6.2 — Multi-objective commerce confidence validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MULTI_OBJECTIVE_BOUNDED_ENV, runMultiObjectivePartitions } from "./lib/multiObjectiveRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, multiObjectiveCommerce: m } of runMultiObjectivePartitions(MULTI_OBJECTIVE_BOUNDED_ENV)) {
  const ok = m.multiObjectiveConfidence >= 0.3 && m.multiObjectiveConfidence <= 1 && !m.monitoring.conversionInflation;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} confidence=${m.multiObjectiveConfidence}`);
  } else {
    console.log(`OK ${trayId} confidence=${m.multiObjectiveConfidence}`);
  }
}

saveLiveObservabilityRun({ suite: "multi-objective-confidence", phase: "P6.2", pass: failed === 0 }, "multi-objective-confidence");
if (failed) process.exit(1);
console.log("\nMulti-objective commerce confidence passed");

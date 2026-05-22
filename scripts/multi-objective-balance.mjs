/**
 * P6.2 — Multi-objective commerce balance validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MULTI_OBJECTIVE_BOUNDED_ENV, runMultiObjectivePartitions } from "./lib/multiObjectiveRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, multiObjectiveCommerce: m } of runMultiObjectivePartitions(MULTI_OBJECTIVE_BOUNDED_ENV)) {
  const ok =
    m.analytics.trustAnalytics >= 0 &&
    m.analytics.conversionAnalytics >= 0 &&
    m.analytics.topDriftCount <= 1 &&
    m.monitoring.continuityValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { trust: m.analytics.trustAnalytics, continuity: m.analytics.continuityAnalytics });
  } else {
    console.log(`OK ${trayId} quality=${m.qualityObjective} price=${m.priceObjective} conversion=${m.conversionObjective}`);
  }
}

saveLiveObservabilityRun({ suite: "multi-objective-balance", phase: "P6.2", pass: failed === 0 }, "multi-objective-balance");
if (failed) process.exit(1);
console.log("\nMulti-objective commerce balance passed");

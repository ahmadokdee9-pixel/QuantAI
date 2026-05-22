/**
 * P6.1 — Intent cognition balance validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { INTENT_COGNITION_BOUNDED_ENV, runIntentCognitionPartitions } from "./lib/intentRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, intentCognition: i } of runIntentCognitionPartitions(INTENT_COGNITION_BOUNDED_ENV)) {
  const ok =
    i.analytics.trustAnalytics >= 0 &&
    i.analytics.readinessAnalytics >= 0 &&
    i.analytics.topDriftCount <= 1 &&
    i.monitoring.continuityValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { trust: i.analytics.trustAnalytics, continuity: i.analytics.continuityAnalytics });
  } else {
    console.log(`OK ${trayId} premium=${i.premiumIntent} value=${i.valueIntent}`);
  }
}

saveLiveObservabilityRun({ suite: "intent-cognition-balance", phase: "P6.1", pass: failed === 0 }, "intent-cognition-balance");
if (failed) process.exit(1);
console.log("\nIntent cognition balance passed");

/**
 * P6.0 — Cognition balancing (trust/value, continuity, fusion).
 * Usage: npm run test:cognition-balance
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COGNITION_BOUNDED_ENV, runCognitionPartitions } from "./lib/cognitionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runCognitionPartitions(COGNITION_BOUNDED_ENV);

for (const { trayId, cognitionEngine: c } of rows) {
  const ok =
    c.analytics.trustValueAnalytics >= 1 &&
    c.analytics.conversionProbabilityAnalytics >= 0 &&
    c.analytics.topDriftCount <= 1 &&
    c.monitoring.rankingContinuityValid;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, {
      trustValue: c.analytics.trustValueAnalytics,
      conversion: c.analytics.conversionProbabilityAnalytics,
    });
  } else {
    console.log(`OK ${trayId} trustValue=${c.analytics.trustValueAnalytics} fusion=${c.reasoningFusion}`);
  }
}

saveLiveObservabilityRun({ suite: "cognition-balance", phase: "P6.0", pass: failed === 0 }, "cognition-balance");

if (failed) process.exit(1);
console.log("\nCognition engine balance passed");

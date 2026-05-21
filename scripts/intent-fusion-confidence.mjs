/**
 * P5.4 — Fusion confidence stability.
 * Usage: npm run test:intent-fusion-confidence
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { FUSION_BOUNDED_ENV, runFusionPartitions } from "./lib/intentFusionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runFusionPartitions(FUSION_BOUNDED_ENV);

for (const { trayId, fusion: f } of rows) {
  const ok =
    f.fusionConfidence >= 0.3 &&
    f.fusionConfidence <= 1 &&
    f.analytics.commerceConfidenceAnalytics >= 30 &&
    !f.monitoring.confidenceInflation;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} confidence=${f.fusionConfidence} analytics=${f.analytics.commerceConfidenceAnalytics}`);
  } else {
    console.log(`OK ${trayId} confidence=${f.fusionConfidence} analytics=${f.analytics.commerceConfidenceAnalytics}`);
  }
}

saveLiveObservabilityRun({ suite: "intent-fusion-confidence", phase: "P5.4", pass: failed === 0 }, "intent-fusion-confidence");

if (failed) process.exit(1);
console.log("\nIntent fusion confidence passed");

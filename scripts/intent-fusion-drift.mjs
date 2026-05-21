/**
 * P5.4 — Fusion drift ≤ 1.0.
 * Usage: npm run test:intent-fusion-drift
 */
import { INTENT_FUSION_MAX_DELTA, INTENT_FUSION_MAX_DRIFT } from "../lib/intent/intentFusionFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { FUSION_BOUNDED_ENV, runFusionPartitions } from "./lib/intentFusionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runFusionPartitions(FUSION_BOUNDED_ENV);

for (const { trayId, fusion: f } of rows) {
  const ok =
    f.fusionDelta <= INTENT_FUSION_MAX_DELTA &&
    f.analytics.topDriftCount <= INTENT_FUSION_MAX_DRIFT &&
    !f.monitoring.fusionDrift;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: f.fusionDelta, topDrift: f.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${f.fusionDelta} topDrift=${f.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "intent-fusion-drift", phase: "P5.4", pass: failed === 0 }, "intent-fusion-drift");

if (failed) process.exit(1);
console.log("\nIntent fusion drift passed");

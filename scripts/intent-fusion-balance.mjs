/**
 * P5.4 — Fusion balancing (trust/value, premium/budget, suppression/diversity).
 * Usage: npm run test:intent-fusion-balance
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { FUSION_BOUNDED_ENV, runFusionPartitions } from "./lib/intentFusionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runFusionPartitions(FUSION_BOUNDED_ENV);

for (const { trayId, fusion: f } of rows) {
  const ok =
    f.analytics.trustValueAnalytics >= 8 &&
    f.analytics.suppressionRecoveryAnalytics >= 0 &&
    f.analytics.diversityPreservationAnalytics >= 0 &&
    f.analytics.merchantFairnessAnalytics >= 40;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, {
      trustValue: f.analytics.trustValueAnalytics,
      fairness: f.analytics.merchantFairnessAnalytics,
    });
  } else {
    console.log(
      `OK ${trayId} trustValue=${f.analytics.trustValueAnalytics} fairness=${f.analytics.merchantFairnessAnalytics}`
    );
  }
}

saveLiveObservabilityRun({ suite: "intent-fusion-balance", phase: "P5.4", pass: failed === 0 }, "intent-fusion-balance");

if (failed) process.exit(1);
console.log("\nIntent fusion balance passed");

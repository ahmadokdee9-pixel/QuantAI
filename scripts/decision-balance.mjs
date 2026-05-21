/**
 * P5.6 — Decision balancing (trust/value, continuity, recommendation).
 * Usage: npm run test:decision-balance
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { DECISION_BOUNDED_ENV, runDecisionPartitions } from "./lib/decisionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runDecisionPartitions(DECISION_BOUNDED_ENV);

for (const { trayId, decisionIntelligence: d } of rows) {
  const ok =
    d.analytics.trustValueAnalytics >= 0 &&
    d.analytics.purchaseQualityAnalytics >= 1 &&
    !d.monitoring.rankingDrift &&
    d.monitoring.recommendationStability;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, {
      trustValue: d.analytics.trustValueAnalytics,
      purchase: d.analytics.purchaseQualityAnalytics,
    });
  } else {
    console.log(`OK ${trayId} trustValue=${d.analytics.trustValueAnalytics} continuity=${d.continuityStrength}`);
  }
}

saveLiveObservabilityRun({ suite: "decision-balance", phase: "P5.6", pass: failed === 0 }, "decision-balance");

if (failed) process.exit(1);
console.log("\nDecision intelligence balance passed");

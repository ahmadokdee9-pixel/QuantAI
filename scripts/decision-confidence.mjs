/**
 * P5.6 — Decision confidence stability.
 * Usage: npm run test:decision-confidence
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { DECISION_BOUNDED_ENV, runDecisionPartitions } from "./lib/decisionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runDecisionPartitions(DECISION_BOUNDED_ENV);

for (const { trayId, decisionIntelligence: d } of rows) {
  const ok =
    d.decisionConfidence >= 0.3 &&
    d.decisionConfidence <= 1 &&
    d.analytics.recommendationQualityAnalytics >= 0 &&
    !d.monitoring.confidenceInflation;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} confidence=${d.decisionConfidence}`);
  } else {
    console.log(`OK ${trayId} confidence=${d.decisionConfidence}`);
  }
}

saveLiveObservabilityRun({ suite: "decision-confidence", phase: "P5.6", pass: failed === 0 }, "decision-confidence");

if (failed) process.exit(1);
console.log("\nDecision intelligence confidence passed");

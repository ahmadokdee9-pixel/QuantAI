/**
 * P5.6 — Decision drift ≤ 1.0.
 * Usage: npm run test:decision-drift
 */
import { DECISION_MAX_DELTA, DECISION_MAX_DRIFT } from "../lib/decision/decisionFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { DECISION_BOUNDED_ENV, runDecisionPartitions } from "./lib/decisionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runDecisionPartitions(DECISION_BOUNDED_ENV);

for (const { trayId, decisionIntelligence: d } of rows) {
  const ok =
    d.decisionDelta <= DECISION_MAX_DELTA &&
    d.analytics.topDriftCount <= DECISION_MAX_DRIFT &&
    !d.monitoring.rankingDrift;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: d.decisionDelta, topDrift: d.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${d.decisionDelta} topDrift=${d.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "decision-drift", phase: "P5.6", pass: failed === 0 }, "decision-drift");

if (failed) process.exit(1);
console.log("\nDecision intelligence drift passed");

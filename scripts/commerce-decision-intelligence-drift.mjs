/**
 * P6.6 — Commerce decision intelligence drift validation.
 */
import { COMMERCE_DECISION_MAX_DELTA, COMMERCE_DECISION_MAX_DRIFT } from "../lib/commerceDecision/commerceDecisionFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV, runCommerceDecisionPartitions } from "./lib/commerceDecisionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, commerceDecisionIntelligence: m } of runCommerceDecisionPartitions(COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV)) {
  const pass = m.decisionDelta <= COMMERCE_DECISION_MAX_DELTA && m.analytics.topDriftCount <= COMMERCE_DECISION_MAX_DRIFT;
  if (!pass) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: m.decisionDelta, topDrift: m.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${m.decisionDelta} topDrift=${m.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "commerce-decision-intelligence-drift", phase: "P6.6", pass: failed === 0 }, "commerce-decision-intelligence-drift");
if (failed) process.exit(1);
console.log("\nCommerce decision intelligence drift passed");

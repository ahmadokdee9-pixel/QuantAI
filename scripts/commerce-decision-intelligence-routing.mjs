/**
 * P6.6 — Commerce decision intelligence routing validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV, runCommerceDecisionPartitions } from "./lib/commerceDecisionRunner.mjs";

const VALID_LANES = new Set([
  "hold",
  "stabilize",
  "reinforce",
  "recommendation-check",
  "outcome-check",
  "promotion-check",
  "purchase-check",
  "trust-value-check",
  "conversion-check",
  "consistency-check",
  "tradeoff-check",
  "decision-safe",
  "replay-protect",
]);

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, commerceDecisionIntelligence: m } of runCommerceDecisionPartitions(COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV)) {
  const ok = VALID_LANES.has(m.routingLane) && m.analytics.replayIntegrityAnalytics >= 60 && m.monitoring.replayIntegrityValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${m.routingLane}`);
  } else {
    console.log(`OK ${trayId} lane=${m.routingLane} graph=${m.graphExecutionHash.slice(0, 20)}`);
  }
}

saveLiveObservabilityRun({ suite: "commerce-decision-intelligence-routing", phase: "P6.6", pass: failed === 0 }, "commerce-decision-intelligence-routing");
if (failed) process.exit(1);
console.log("\nCommerce decision intelligence routing passed");

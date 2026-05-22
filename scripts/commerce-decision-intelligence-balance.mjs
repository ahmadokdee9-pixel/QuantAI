/**
 * P6.6 — Commerce decision intelligence balance validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV, runCommerceDecisionPartitions } from "./lib/commerceDecisionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, commerceDecisionIntelligence: m } of runCommerceDecisionPartitions(COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV)) {
  const ok =
    m.trustworthyDecisionContinuity >= 0 &&
    m.trustworthyDecisionContinuity <= 1 &&
    m.balancedDecisionFormation >= 0 &&
    m.balancedDecisionFormation <= 1 &&
    m.analytics.harmonyAnalytics >= 40;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} continuity=${m.trustworthyDecisionContinuity} formation=${m.balancedDecisionFormation}`);
  } else {
    console.log(`OK ${trayId} continuity=${m.trustworthyDecisionContinuity} formation=${m.balancedDecisionFormation} harmony=${m.analytics.harmonyAnalytics}`);
  }
}

saveLiveObservabilityRun({ suite: "commerce-decision-intelligence-balance", phase: "P6.6", pass: failed === 0 }, "commerce-decision-intelligence-balance");
if (failed) process.exit(1);
console.log("\nCommerce decision intelligence balance passed");

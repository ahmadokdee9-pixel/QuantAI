/**
 * P6.6 — Commerce decision intelligence confidence validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV, runCommerceDecisionPartitions } from "./lib/commerceDecisionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, commerceDecisionIntelligence: m } of runCommerceDecisionPartitions(COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV)) {
  const ok = m.decisionConfidence >= 0.3 && m.decisionConfidence <= 1;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} confidence=${m.decisionConfidence}`);
  } else {
    console.log(`OK ${trayId} confidence=${m.decisionConfidence}`);
  }
}

saveLiveObservabilityRun({ suite: "commerce-decision-intelligence-confidence", phase: "P6.6", pass: failed === 0 }, "commerce-decision-intelligence-confidence");
if (failed) process.exit(1);
console.log("\nCommerce decision intelligence confidence passed");

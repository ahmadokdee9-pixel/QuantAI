/**
 * P6.6 — Commerce decision intelligence integrity validation.
 */
import { COMMERCE_DECISION_MAX_DELTA } from "../lib/commerceDecision/commerceDecisionFlags.ts";
import {
  isCommerceDecisionIntelligenceEnabled,
  isCommerceDecisionIntelligenceEnvironmentAllowed,
} from "../lib/commerceDecision/commerceDecisionIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV, runCommerceDecisionPartitions } from "./lib/commerceDecisionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, commerceDecisionIntelligence: m } of runCommerceDecisionPartitions(COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV)) {
  const pass = m.decisionDelta <= COMMERCE_DECISION_MAX_DELTA && m.analytics.replayIntegrityAnalytics >= 60;
  if (!pass) {
    failed += 1;
    console.error(`FAIL ${trayId} delta=${m.decisionDelta}`);
  } else {
    console.log(`OK ${trayId} delta=${m.decisionDelta}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.COMMERCE_DECISION_INTELLIGENCE_ENABLED = "true";
process.env.COMMERCE_DECISION_INTELLIGENCE_MODE = "bounded-decision";
delete process.env.COMMERCE_DECISION_INTELLIGENCE_PROD_APPLY;
delete process.env.COMMERCE_DECISION_INTELLIGENCE_CANARY_APPLY;
const blocked = isCommerceDecisionIntelligenceEnabled() && !isCommerceDecisionIntelligenceEnvironmentAllowed();
Object.assign(process.env, saved);

if (!blocked) {
  failed += 1;
  console.error("FAIL production blocked without opt-in");
} else {
  console.log("OK production blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "commerce-decision-intelligence-integrity", phase: "P6.6", pass: failed === 0 }, "commerce-decision-intelligence-integrity");
if (failed) process.exit(1);
console.log("\nCommerce decision intelligence integrity passed");

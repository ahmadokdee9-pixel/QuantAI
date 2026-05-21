/**
 * P5.6 — Trust/premium/merchant integrity under decision layer.
 * Usage: npm run test:decision-integrity
 */
import {
  isDecisionIntelligenceEnabled,
  isDecisionIntelligenceEnvironmentAllowed,
  isDecisionIntelligenceMutationEnabled,
} from "../lib/decision/decisionIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { DECISION_BOUNDED_ENV, runDecisionPartitions } from "./lib/decisionRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runDecisionPartitions(DECISION_BOUNDED_ENV);

for (const { trayId, decisionIntelligence: d } of rows) {
  const ok =
    d.trustDecision <= 0.8 &&
    d.premiumDecision <= 0.75 &&
    d.analytics.merchantReliabilityAnalytics >= 0 &&
    !d.monitoring.merchantRisk;

  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { trust: d.trustDecision, premium: d.premiumDecision });
  } else {
    console.log(`OK ${trayId} trust=${d.trustDecision} premium=${d.premiumDecision} merchant=${d.analytics.merchantReliabilityAnalytics}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.DECISION_INTELLIGENCE_ENABLED = "true";
process.env.DECISION_INTELLIGENCE_MODE = "bounded-decision";
delete process.env.DECISION_INTELLIGENCE_PROD_APPLY;
delete process.env.DECISION_INTELLIGENCE_CANARY_APPLY;
const blocked = isDecisionIntelligenceEnabled() && !isDecisionIntelligenceMutationEnabled() && !isDecisionIntelligenceEnvironmentAllowed();
Object.assign(process.env, saved);

if (!blocked) {
  failed += 1;
  console.error("FAIL production decision blocked without opt-in");
} else {
  console.log("OK production decision blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "decision-integrity", phase: "P5.6", pass: failed === 0 }, "decision-integrity");

if (failed) process.exit(1);
console.log("\nDecision intelligence integrity passed");

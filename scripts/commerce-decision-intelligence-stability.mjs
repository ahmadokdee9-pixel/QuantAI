/**
 * P6.6 — Commerce decision intelligence stability validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV, runCommerceDecisionPartitions } from "./lib/commerceDecisionRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, commerceDecisionIntelligence: m } of runCommerceDecisionPartitions(COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV)) {
  const ok = m.decisionScore >= 30 && m.decisionConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${m.decisionScore}`);
  } else {
    console.log(`OK ${trayId} score=${m.decisionScore} confidence=${m.decisionConfidence}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = { ...COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV, COMMERCE_DECISION_INTELLIGENCE_EMERGENCY_SHUTDOWN: "true" };
if (runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv).commerceDecisionIntelligence.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "commerce-decision-intelligence-stability", phase: "P6.6", pass: failed === 0 }, "commerce-decision-intelligence-stability");
if (failed) process.exit(1);
console.log("\nCommerce decision intelligence stability passed");

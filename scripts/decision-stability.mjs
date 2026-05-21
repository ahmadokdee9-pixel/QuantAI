/**
 * P5.6 — Decision stability + emergency shutdown.
 * Usage: npm run test:decision-stability
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { DECISION_BOUNDED_ENV, runDecisionPartitions } from "./lib/decisionRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
const rows = runDecisionPartitions(DECISION_BOUNDED_ENV);

for (const { trayId, decisionIntelligence: d } of rows) {
  const ok = d.decisionScore >= 30 && d.decisionConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${d.decisionScore} confidence=${d.decisionConfidence}`);
  } else {
    console.log(`OK ${trayId} score=${d.decisionScore} confidence=${d.decisionConfidence}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = { ...DECISION_BOUNDED_ENV, DECISION_INTELLIGENCE_EMERGENCY_SHUTDOWN: "true" };
const shutdownRow = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv);
if (shutdownRow.decisionIntelligence.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "decision-stability", phase: "P5.6", pass: failed === 0 }, "decision-stability");

if (failed) process.exit(1);
console.log("\nDecision intelligence stability passed");

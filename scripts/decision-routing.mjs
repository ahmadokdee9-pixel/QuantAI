/**
 * P5.6 — Decision routing lanes validation.
 * Usage: npm run test:decision-routing
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { DECISION_BOUNDED_ENV, runDecisionPartitions } from "./lib/decisionRunner.mjs";

const VALID_LANES = new Set([
  "hold",
  "stabilize",
  "reinforce",
  "compare",
  "confidence-check",
  "decision-balance",
  "risk-check",
  "replay-protect",
  "commerce-safe",
]);

clearIntentMemoryStore();
let failed = 0;
const rows = runDecisionPartitions(DECISION_BOUNDED_ENV);

for (const { trayId, decisionIntelligence: d } of rows) {
  const ok = VALID_LANES.has(d.routingLane) && d.replayIntegrity >= 60 && d.monitoring.replayIntegrityValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${d.routingLane} replay=${d.replayIntegrity}`);
  } else {
    console.log(`OK ${trayId} lane=${d.routingLane} replay=${d.replayIntegrity} graph=${d.graphExecutionHash.slice(0, 20)}`);
  }
}

saveLiveObservabilityRun({ suite: "decision-routing", phase: "P5.6", pass: failed === 0 }, "decision-routing");

if (failed) process.exit(1);
console.log("\nDecision intelligence routing passed");

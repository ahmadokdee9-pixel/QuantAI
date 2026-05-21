/**
 * P5.5 — Reasoning routing lanes validation.
 * Usage: npm run test:reasoning-routing
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { REASONING_BOUNDED_ENV, runReasoningPartitions } from "./lib/reasoningRunner.mjs";

const VALID_LANES = new Set([
  "hold",
  "stabilize",
  "reinforce",
  "recover",
  "compare",
  "confidence-check",
  "reasoning-balance",
  "replay-protect",
]);

clearIntentMemoryStore();
let failed = 0;
const rows = runReasoningPartitions(REASONING_BOUNDED_ENV);

for (const { trayId, adaptiveReasoning: r } of rows) {
  const ok = VALID_LANES.has(r.routingLane) && r.replayIntegrity >= 60 && r.monitoring.replayIntegrityValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${r.routingLane} replay=${r.replayIntegrity}`);
  } else {
    console.log(`OK ${trayId} lane=${r.routingLane} replay=${r.replayIntegrity} graph=${r.graphExecutionHash.slice(0, 20)}`);
  }
}

saveLiveObservabilityRun({ suite: "reasoning-routing", phase: "P5.5", pass: failed === 0 }, "reasoning-routing");

if (failed) process.exit(1);
console.log("\nAdaptive reasoning routing passed");

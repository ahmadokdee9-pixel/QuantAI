/**
 * P6.7 — Autonomous commerce reasoning graph routing validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV, runCommerceReasoningGraphPartitions } from "./lib/commerceReasoningGraphRunner.mjs";

const VALID_LANES = new Set([
  "hold",
  "stabilize",
  "reinforce",
  "structure-check",
  "circular-check",
  "branch-check",
  "causal-check",
  "drift-check",
  "causality-check",
  "path-check",
  "graph-safe",
  "replay-protect",
]);

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, autonomousCommerceReasoningGraph: m } of runCommerceReasoningGraphPartitions(AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV)) {
  const ok = VALID_LANES.has(m.routingLane) && m.analytics.replayIntegrityAnalytics >= 60 && m.monitoring.replayIntegrityValid;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${m.routingLane}`);
  } else {
    console.log(`OK ${trayId} lane=${m.routingLane} graph=${m.graphExecutionHash.slice(0, 20)}`);
  }
}

saveLiveObservabilityRun({ suite: "autonomous-commerce-reasoning-graph-routing", phase: "P6.7", pass: failed === 0 }, "autonomous-commerce-reasoning-graph-routing");
if (failed) process.exit(1);
console.log("\nAutonomous commerce reasoning graph routing passed");

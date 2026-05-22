/**
 * P6.7 — Autonomous commerce reasoning graph drift validation.
 */
import { COMMERCE_REASONING_GRAPH_MAX_DELTA, COMMERCE_REASONING_GRAPH_MAX_DRIFT } from "../lib/commerceReasoningGraph/commerceReasoningGraphFlags.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV, runCommerceReasoningGraphPartitions } from "./lib/commerceReasoningGraphRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, autonomousCommerceReasoningGraph: m } of runCommerceReasoningGraphPartitions(AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV)) {
  const pass = m.graphDelta <= COMMERCE_REASONING_GRAPH_MAX_DELTA && m.analytics.topDriftCount <= COMMERCE_REASONING_GRAPH_MAX_DRIFT;
  if (!pass) {
    failed += 1;
    console.error(`FAIL ${trayId}`, { delta: m.graphDelta, topDrift: m.analytics.topDriftCount });
  } else {
    console.log(`OK ${trayId} delta=${m.graphDelta} topDrift=${m.analytics.topDriftCount}`);
  }
}

saveLiveObservabilityRun({ suite: "autonomous-commerce-reasoning-graph-drift", phase: "P6.7", pass: failed === 0 }, "autonomous-commerce-reasoning-graph-drift");
if (failed) process.exit(1);
console.log("\nAutonomous commerce reasoning graph drift passed");

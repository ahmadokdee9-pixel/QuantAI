/**
 * P6.7 — Autonomous commerce reasoning graph confidence validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV, runCommerceReasoningGraphPartitions } from "./lib/commerceReasoningGraphRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, autonomousCommerceReasoningGraph: m } of runCommerceReasoningGraphPartitions(AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV)) {
  const ok = m.graphConfidence >= 0.3 && m.graphConfidence <= 1;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} confidence=${m.graphConfidence}`);
  } else {
    console.log(`OK ${trayId} confidence=${m.graphConfidence}`);
  }
}

saveLiveObservabilityRun({ suite: "autonomous-commerce-reasoning-graph-confidence", phase: "P6.7", pass: failed === 0 }, "autonomous-commerce-reasoning-graph-confidence");
if (failed) process.exit(1);
console.log("\nAutonomous commerce reasoning graph confidence passed");

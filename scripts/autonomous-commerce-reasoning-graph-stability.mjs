/**
 * P6.7 — Autonomous commerce reasoning graph stability validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV, runCommerceReasoningGraphPartitions } from "./lib/commerceReasoningGraphRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, autonomousCommerceReasoningGraph: m } of runCommerceReasoningGraphPartitions(AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV)) {
  const ok = m.graphScore >= 30 && m.graphConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${m.graphScore}`);
  } else {
    console.log(`OK ${trayId} score=${m.graphScore} confidence=${m.graphConfidence}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = { ...AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV, AUTONOMOUS_COMMERCE_REASONING_GRAPH_EMERGENCY_SHUTDOWN: "true" };
if (runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv).autonomousCommerceReasoningGraph.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "autonomous-commerce-reasoning-graph-stability", phase: "P6.7", pass: failed === 0 }, "autonomous-commerce-reasoning-graph-stability");
if (failed) process.exit(1);
console.log("\nAutonomous commerce reasoning graph stability passed");

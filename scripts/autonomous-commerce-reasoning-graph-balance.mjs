/**
 * P6.7 — Autonomous commerce reasoning graph balance validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV, runCommerceReasoningGraphPartitions } from "./lib/commerceReasoningGraphRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, autonomousCommerceReasoningGraph: m } of runCommerceReasoningGraphPartitions(AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV)) {
  const ok =
    m.trustworthyReasoningContinuity >= 0 &&
    m.trustworthyReasoningContinuity <= 1 &&
    m.deterministicDecisionCausality >= 0 &&
    m.deterministicDecisionCausality <= 1 &&
    m.analytics.harmonyAnalytics >= 40;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} continuity=${m.trustworthyReasoningContinuity} causality=${m.deterministicDecisionCausality}`);
  } else {
    console.log(`OK ${trayId} continuity=${m.trustworthyReasoningContinuity} causality=${m.deterministicDecisionCausality} harmony=${m.analytics.harmonyAnalytics}`);
  }
}

saveLiveObservabilityRun({ suite: "autonomous-commerce-reasoning-graph-balance", phase: "P6.7", pass: failed === 0 }, "autonomous-commerce-reasoning-graph-balance");
if (failed) process.exit(1);
console.log("\nAutonomous commerce reasoning graph balance passed");

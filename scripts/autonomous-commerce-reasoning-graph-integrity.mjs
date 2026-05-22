/**
 * P6.7 — Autonomous commerce reasoning graph integrity validation.
 */
import { COMMERCE_REASONING_GRAPH_MAX_DELTA } from "../lib/commerceReasoningGraph/commerceReasoningGraphFlags.ts";
import {
  isAutonomousCommerceReasoningGraphEnabled,
  isAutonomousCommerceReasoningGraphEnvironmentAllowed,
} from "../lib/commerceReasoningGraph/commerceReasoningGraphIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV, runCommerceReasoningGraphPartitions } from "./lib/commerceReasoningGraphRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, autonomousCommerceReasoningGraph: m } of runCommerceReasoningGraphPartitions(AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV)) {
  const pass = m.graphDelta <= COMMERCE_REASONING_GRAPH_MAX_DELTA && m.analytics.replayIntegrityAnalytics >= 60;
  if (!pass) {
    failed += 1;
    console.error(`FAIL ${trayId} delta=${m.graphDelta}`);
  } else {
    console.log(`OK ${trayId} delta=${m.graphDelta}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.AUTONOMOUS_COMMERCE_REASONING_GRAPH_ENABLED = "true";
process.env.AUTONOMOUS_COMMERCE_REASONING_GRAPH_MODE = "bounded-graph";
delete process.env.AUTONOMOUS_COMMERCE_REASONING_GRAPH_PROD_APPLY;
delete process.env.AUTONOMOUS_COMMERCE_REASONING_GRAPH_CANARY_APPLY;
const blocked = isAutonomousCommerceReasoningGraphEnabled() && !isAutonomousCommerceReasoningGraphEnvironmentAllowed();
Object.assign(process.env, saved);

if (!blocked) {
  failed += 1;
  console.error("FAIL production blocked without opt-in");
} else {
  console.log("OK production blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "autonomous-commerce-reasoning-graph-integrity", phase: "P6.7", pass: failed === 0 }, "autonomous-commerce-reasoning-graph-integrity");
if (failed) process.exit(1);
console.log("\nAutonomous commerce reasoning graph integrity passed");

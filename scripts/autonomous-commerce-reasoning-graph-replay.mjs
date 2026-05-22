/**
 * P6.7 — Autonomous commerce reasoning graph replay validation.
 */
import {
  applyControlledAutonomousCommerceReasoningGraph,
  validateDeterministicCommerceReasoningGraphReplay,
} from "../lib/commerceReasoningGraph/commerceReasoningGraphIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV } from "./lib/commerceReasoningGraphRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

let failed = 0;
for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, AUTONOMOUS_COMMERCE_REASONING_GRAPH_BOUNDED_ENV);
  const args = {
    products: row.commerceDecisionProducts,
    query: row.query,
    canonicalQuery: buildCanonicalQuery(row.query),
    governance: row.governance,
    calibration: row.calibration,
    runtime: row.runtime,
    orchestration: row.orchestration,
    memory: row.memory,
    coordination: row.coordination,
    fusion: row.fusion,
    multiObjective: row.multiObjectiveCommerce,
    intent: row.intentCognition,
    strategic: row.adaptiveStrategicRanking,
    memoryless: row.memorylessCommerceLearning,
    marketReality: row.marketRealityIntelligence,
    commerceDecision: row.commerceDecisionIntelligence,
    preOrderLinks: row.commerceDecisionProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };
  const run1 = applyControlledAutonomousCommerceReasoningGraph(args);
  clearIntentMemoryStore();
  const run2 = applyControlledAutonomousCommerceReasoningGraph(args);
  if (!validateDeterministicCommerceReasoningGraphReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

saveLiveObservabilityRun({ suite: "autonomous-commerce-reasoning-graph-replay", phase: "P6.7", pass: failed === 0 }, "autonomous-commerce-reasoning-graph-replay");
if (failed) process.exit(1);
console.log("\nAutonomous commerce reasoning graph replay passed");

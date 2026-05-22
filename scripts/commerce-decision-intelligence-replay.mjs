/**
 * P6.6 — Commerce decision intelligence replay validation.
 */
import {
  applyControlledCommerceDecisionIntelligence,
  validateDeterministicCommerceDecisionReplay,
} from "../lib/commerceDecision/commerceDecisionIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV } from "./lib/commerceDecisionRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

let failed = 0;
for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, COMMERCE_DECISION_INTELLIGENCE_BOUNDED_ENV);
  const args = {
    products: row.marketRealityProducts,
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
    preOrderLinks: row.marketRealityProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };
  const run1 = applyControlledCommerceDecisionIntelligence(args);
  clearIntentMemoryStore();
  const run2 = applyControlledCommerceDecisionIntelligence(args);
  if (!validateDeterministicCommerceDecisionReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

saveLiveObservabilityRun({ suite: "commerce-decision-intelligence-replay", phase: "P6.6", pass: failed === 0 }, "commerce-decision-intelligence-replay");
if (failed) process.exit(1);
console.log("\nCommerce decision intelligence replay passed");

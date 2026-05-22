/**
 * P6.2 — Multi-objective commerce replay validation.
 */
import {
  applyControlledMultiObjectiveCommerce,
  validateDeterministicMultiObjectiveReplay,
} from "../lib/multiObjective/multiObjectiveIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MULTI_OBJECTIVE_BOUNDED_ENV } from "./lib/multiObjectiveRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;
for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, MULTI_OBJECTIVE_BOUNDED_ENV);
  const args = {
    products: row.intentCognitionProducts,
    query: row.query,
    canonicalQuery: buildCanonicalQuery(row.query),
    governance: row.governance,
    calibration: row.calibration,
    runtime: row.runtime,
    orchestration: row.orchestration,
    memory: row.memory,
    coordination: row.coordination,
    fusion: row.fusion,
    reasoning: row.adaptiveReasoning,
    decision: row.decisionIntelligence,
    strategy: row.strategyIntelligence,
    market: row.marketIntelligence,
    behavioral: row.behavioralCommerce,
    cognition: row.cognitionEngine,
    intent: row.intentCognition,
    preOrderLinks: row.intentCognitionProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };
  clearIntentMemoryStore();
  const run1 = applyControlledMultiObjectiveCommerce(args);
  clearIntentMemoryStore();
  const run2 = applyControlledMultiObjectiveCommerce(args);
  if (!validateDeterministicMultiObjectiveReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

saveLiveObservabilityRun({ suite: "multi-objective-replay", phase: "P6.2", pass: failed === 0 }, "multi-objective-replay");
if (failed) process.exit(1);
console.log("\nMulti-objective commerce replay passed");

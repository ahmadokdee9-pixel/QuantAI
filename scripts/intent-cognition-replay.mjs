/**
 * P6.1 — Intent cognition replay validation.
 */
import {
  applyControlledIntentCognition,
  validateDeterministicIntentReplay,
} from "../lib/intent/intentIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { INTENT_COGNITION_BOUNDED_ENV } from "./lib/intentRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;
for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, INTENT_COGNITION_BOUNDED_ENV);
  const args = {
    products: row.cognitionProducts,
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
    preOrderLinks: row.cognitionProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };
  clearIntentMemoryStore();
  const run1 = applyControlledIntentCognition(args);
  clearIntentMemoryStore();
  const run2 = applyControlledIntentCognition(args);
  if (!validateDeterministicIntentReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

saveLiveObservabilityRun({ suite: "intent-cognition-replay", phase: "P6.1", pass: failed === 0 }, "intent-cognition-replay");
if (failed) process.exit(1);
console.log("\nIntent cognition replay passed");

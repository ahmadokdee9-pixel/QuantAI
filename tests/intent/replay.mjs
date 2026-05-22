/**
 * P6.1 — Intent replay integrity unit tests.
 */
import {
  applyControlledIntentCognition,
  validateDeterministicIntentReplay,
} from "../../lib/intent/intentIntelligence.ts";
import { clearIntentMemoryStore } from "../../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../../lib/search/canonicalQuery.ts";
import { INTENT_COGNITION_BOUNDED_ENV } from "../../scripts/lib/intentRunner.mjs";
import { runIntentEvaluationPartition } from "../../scripts/lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "../../scripts/lib/intentLiveObservabilityPartitions.mjs";

let failed = 0;
clearIntentMemoryStore();
const row = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], INTENT_COGNITION_BOUNDED_ENV);
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
};

clearIntentMemoryStore();
const run1 = applyControlledIntentCognition(args);
clearIntentMemoryStore();
const run2 = applyControlledIntentCognition(args);

if (!validateDeterministicIntentReplay(run1, run2)) {
  failed += 1;
  console.error("FAIL deterministic replay");
} else {
  console.log("OK deterministic replay");
}

if (run1.meta.analytics.replayIntegrityAnalytics < 60) {
  failed += 1;
  console.error(`FAIL replay integrity=${run1.meta.analytics.replayIntegrityAnalytics}`);
} else {
  console.log(`OK replay integrity=${run1.meta.analytics.replayIntegrityAnalytics}`);
}

if (failed) process.exit(1);
console.log("\nIntent replay integrity tests passed");

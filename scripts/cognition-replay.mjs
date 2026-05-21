/**
 * P6.0 — Deterministic cognition replay.
 * Usage: npm run test:cognition-replay
 */
import {
  applyControlledCognitionEngine,
  validateDeterministicCognitionReplay,
} from "../lib/cognition/cognitionIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COGNITION_BOUNDED_ENV } from "./lib/cognitionRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;

for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, COGNITION_BOUNDED_ENV);

  const args = {
    products: row.behavioralProducts,
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
    preOrderLinks: row.behavioralProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };

  clearIntentMemoryStore();
  const run1 = applyControlledCognitionEngine(args);
  clearIntentMemoryStore();
  const run2 = applyControlledCognitionEngine(args);

  if (!validateDeterministicCognitionReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

clearIntentMemoryStore();
const sample = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], COGNITION_BOUNDED_ENV);
const args = {
  products: sample.behavioralProducts,
  query: sample.query,
  canonicalQuery: buildCanonicalQuery(sample.query),
  governance: sample.governance,
  calibration: sample.calibration,
  runtime: sample.runtime,
  orchestration: sample.orchestration,
  memory: sample.memory,
  coordination: sample.coordination,
  fusion: sample.fusion,
  reasoning: sample.adaptiveReasoning,
  decision: sample.decisionIntelligence,
  strategy: sample.strategyIntelligence,
  market: sample.marketIntelligence,
  behavioral: sample.behavioralCommerce,
  trayId: sample.id,
};
clearIntentMemoryStore();
const run1 = applyControlledCognitionEngine(args);
clearIntentMemoryStore();
const run2 = applyControlledCognitionEngine(args);
if (!validateDeterministicCognitionReplay(run1, run2)) {
  failed += 1;
  console.error("FAIL validateDeterministicCognitionReplay");
} else {
  console.log("OK validateDeterministicCognitionReplay");
}

saveLiveObservabilityRun({ suite: "cognition-replay", phase: "P6.0", pass: failed === 0 }, "cognition-replay");

if (failed) process.exit(1);
console.log("\nCognition engine replay passed");

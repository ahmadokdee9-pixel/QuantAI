/**
 * P5.6 — Deterministic decision replay.
 * Usage: npm run test:decision-replay
 */
import {
  applyControlledDecisionIntelligence,
  validateDeterministicDecisionReplay,
} from "../lib/decision/decisionIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { DECISION_BOUNDED_ENV } from "./lib/decisionRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;

for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, DECISION_BOUNDED_ENV);

  const args = {
    products: row.reasoningProducts,
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
    preOrderLinks: row.reasoningProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };

  clearIntentMemoryStore();
  const run1 = applyControlledDecisionIntelligence(args);
  clearIntentMemoryStore();
  const run2 = applyControlledDecisionIntelligence(args);

  if (!validateDeterministicDecisionReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

clearIntentMemoryStore();
const sample = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], DECISION_BOUNDED_ENV);
const args = {
  products: sample.reasoningProducts,
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
  trayId: sample.id,
};
clearIntentMemoryStore();
const run1 = applyControlledDecisionIntelligence(args);
clearIntentMemoryStore();
const run2 = applyControlledDecisionIntelligence(args);
if (!validateDeterministicDecisionReplay(run1, run2)) {
  failed += 1;
  console.error("FAIL validateDeterministicDecisionReplay");
} else {
  console.log("OK validateDeterministicDecisionReplay");
}

saveLiveObservabilityRun({ suite: "decision-replay", phase: "P5.6", pass: failed === 0 }, "decision-replay");

if (failed) process.exit(1);
console.log("\nDecision intelligence replay passed");

/**
 * P5.5 — Deterministic reasoning replay.
 * Usage: npm run test:reasoning-replay
 */
import {
  applyControlledAdaptiveReasoning,
  validateDeterministicReasoningReplay,
} from "../lib/reasoning/adaptiveReasoning.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { REASONING_BOUNDED_ENV } from "./lib/reasoningRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;

for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, REASONING_BOUNDED_ENV);

  const args = {
    products: row.fusionProducts,
    query: row.query,
    canonicalQuery: buildCanonicalQuery(row.query),
    governance: row.governance,
    calibration: row.calibration,
    runtime: row.runtime,
    orchestration: row.orchestration,
    memory: row.memory,
    coordination: row.coordination,
    fusion: row.fusion,
    preOrderLinks: row.fusionProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };

  clearIntentMemoryStore();
  const run1 = applyControlledAdaptiveReasoning(args);
  clearIntentMemoryStore();
  const run2 = applyControlledAdaptiveReasoning(args);

  if (!validateDeterministicReasoningReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

clearIntentMemoryStore();
const sample = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], REASONING_BOUNDED_ENV);
const args = {
  products: sample.fusionProducts,
  query: sample.query,
  canonicalQuery: buildCanonicalQuery(sample.query),
  governance: sample.governance,
  calibration: sample.calibration,
  runtime: sample.runtime,
  orchestration: sample.orchestration,
  memory: sample.memory,
  coordination: sample.coordination,
  fusion: sample.fusion,
  trayId: sample.id,
};
clearIntentMemoryStore();
const run1 = applyControlledAdaptiveReasoning(args);
clearIntentMemoryStore();
const run2 = applyControlledAdaptiveReasoning(args);
if (!validateDeterministicReasoningReplay(run1, run2)) {
  failed += 1;
  console.error("FAIL validateDeterministicReasoningReplay");
} else {
  console.log("OK validateDeterministicReasoningReplay");
}

saveLiveObservabilityRun({ suite: "reasoning-replay", phase: "P5.5", pass: failed === 0 }, "reasoning-replay");

if (failed) process.exit(1);
console.log("\nAdaptive reasoning replay passed");

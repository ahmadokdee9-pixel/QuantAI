/**
 * P5.3 — Deterministic coordination replay.
 * Usage: npm run test:intent-coordination-replay
 */
import {
  applyControlledIntentCoordination,
  validateDeterministicCoordinationReplay,
} from "../lib/intent/intentCoordination.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { COORDINATION_BOUNDED_ENV } from "./lib/intentCoordinationRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;

for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, COORDINATION_BOUNDED_ENV);

  const args = {
    products: row.memoryProducts,
    query: row.query,
    canonicalQuery: buildCanonicalQuery(row.query),
    governance: row.governance,
    calibration: row.calibration,
    runtime: row.runtime,
    orchestration: row.orchestration,
    memory: row.memory,
    preOrderLinks: row.memoryProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };

  clearIntentMemoryStore();
  const run1 = applyControlledIntentCoordination(args);
  clearIntentMemoryStore();
  const run2 = applyControlledIntentCoordination(args);

  if (!validateDeterministicCoordinationReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

clearIntentMemoryStore();
const sample = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], COORDINATION_BOUNDED_ENV);
const args = {
  products: sample.memoryProducts,
  query: sample.query,
  canonicalQuery: buildCanonicalQuery(sample.query),
  governance: sample.governance,
  calibration: sample.calibration,
  runtime: sample.runtime,
  orchestration: sample.orchestration,
  memory: sample.memory,
  trayId: sample.id,
};
clearIntentMemoryStore();
const run1 = applyControlledIntentCoordination(args);
clearIntentMemoryStore();
const run2 = applyControlledIntentCoordination(args);
if (!validateDeterministicCoordinationReplay(run1, run2)) {
  failed += 1;
  console.error("FAIL validateDeterministicCoordinationReplay");
} else {
  console.log("OK validateDeterministicCoordinationReplay");
}

saveLiveObservabilityRun({ suite: "intent-coordination-replay", phase: "P5.3", pass: failed === 0 }, "intent-coordination-replay");

if (failed) process.exit(1);
console.log("\nIntent coordination replay passed");

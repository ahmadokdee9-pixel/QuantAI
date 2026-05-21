/**
 * P5.2 — Deterministic memory replay.
 * Usage: npm run test:intent-memory-replay
 */
import {
  clearIntentMemoryStore,
  validateDeterministicMemoryReplay,
} from "../lib/intent/intentMemory.ts";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MEMORY_BOUNDED_ENV } from "./lib/intentMemoryRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;

for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, MEMORY_BOUNDED_ENV);
  const { buildCanonicalQuery } = await import("../lib/search/canonicalQuery.ts");
  const { applyControlledIntentMemory } = await import("../lib/intent/intentMemory.ts");

  const args = {
    products: row.orchestrationProducts,
    query: row.query,
    canonicalQuery: buildCanonicalQuery(row.query),
    governance: row.governance,
    calibration: row.calibration,
    runtime: row.runtime,
    orchestration: row.orchestration,
    preOrderLinks: row.orchestrationProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };

  clearIntentMemoryStore();
  const run1 = applyControlledIntentMemory(args);
  clearIntentMemoryStore();
  const run2 = applyControlledIntentMemory(args);

  if (!validateDeterministicMemoryReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

clearIntentMemoryStore();
const sample = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], MEMORY_BOUNDED_ENV);
const { applyControlledIntentMemory } = await import("../lib/intent/intentMemory.ts");
const { buildCanonicalQuery } = await import("../lib/search/canonicalQuery.ts");
const args = {
  products: sample.orchestrationProducts,
  query: sample.query,
  canonicalQuery: buildCanonicalQuery(sample.query),
  governance: sample.governance,
  calibration: sample.calibration,
  runtime: sample.runtime,
  orchestration: sample.orchestration,
  trayId: sample.id,
};
clearIntentMemoryStore();
const run1 = applyControlledIntentMemory(args);
clearIntentMemoryStore();
const run2 = applyControlledIntentMemory(args);
if (!validateDeterministicMemoryReplay(run1, run2)) {
  failed += 1;
  console.error("FAIL validateDeterministicMemoryReplay");
} else {
  console.log("OK validateDeterministicMemoryReplay");
}

saveLiveObservabilityRun({ suite: "intent-memory-replay", phase: "P5.2", pass: failed === 0 }, "intent-memory-replay");

if (failed) process.exit(1);
console.log("\nIntent memory replay passed");

/**
 * P5.4 — Deterministic fusion replay.
 * Usage: npm run test:intent-fusion-replay
 */
import {
  applyControlledIntentFusion,
  validateDeterministicFusionReplay,
} from "../lib/intent/intentFusion.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { FUSION_BOUNDED_ENV } from "./lib/intentFusionRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;

for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, FUSION_BOUNDED_ENV);

  const args = {
    products: row.coordinationProducts,
    query: row.query,
    canonicalQuery: buildCanonicalQuery(row.query),
    governance: row.governance,
    calibration: row.calibration,
    runtime: row.runtime,
    orchestration: row.orchestration,
    memory: row.memory,
    coordination: row.coordination,
    preOrderLinks: row.coordinationProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };

  clearIntentMemoryStore();
  const run1 = applyControlledIntentFusion(args);
  clearIntentMemoryStore();
  const run2 = applyControlledIntentFusion(args);

  if (!validateDeterministicFusionReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

clearIntentMemoryStore();
const sample = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], FUSION_BOUNDED_ENV);
const args = {
  products: sample.coordinationProducts,
  query: sample.query,
  canonicalQuery: buildCanonicalQuery(sample.query),
  governance: sample.governance,
  calibration: sample.calibration,
  runtime: sample.runtime,
  orchestration: sample.orchestration,
  memory: sample.memory,
  coordination: sample.coordination,
  trayId: sample.id,
};
clearIntentMemoryStore();
const run1 = applyControlledIntentFusion(args);
clearIntentMemoryStore();
const run2 = applyControlledIntentFusion(args);
if (!validateDeterministicFusionReplay(run1, run2)) {
  failed += 1;
  console.error("FAIL validateDeterministicFusionReplay");
} else {
  console.log("OK validateDeterministicFusionReplay");
}

saveLiveObservabilityRun({ suite: "intent-fusion-replay", phase: "P5.4", pass: failed === 0 }, "intent-fusion-replay");

if (failed) process.exit(1);
console.log("\nIntent fusion replay passed");

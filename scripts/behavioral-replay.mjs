/**
 * P5.9 — Deterministic behavioral replay.
 * Usage: npm run test:behavioral-replay
 */
import {
  applyControlledBehavioralCommerce,
  validateDeterministicBehavioralReplay,
} from "../lib/behavioral/behavioralCommerce.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { BEHAVIORAL_BOUNDED_ENV } from "./lib/behavioralRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;

for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, BEHAVIORAL_BOUNDED_ENV);

  const args = {
    products: row.marketProducts,
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
    preOrderLinks: row.marketProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };

  clearIntentMemoryStore();
  const run1 = applyControlledBehavioralCommerce(args);
  clearIntentMemoryStore();
  const run2 = applyControlledBehavioralCommerce(args);

  if (!validateDeterministicBehavioralReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

clearIntentMemoryStore();
const sample = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], BEHAVIORAL_BOUNDED_ENV);
const args = {
  products: sample.marketProducts,
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
  trayId: sample.id,
};
clearIntentMemoryStore();
const run1 = applyControlledBehavioralCommerce(args);
clearIntentMemoryStore();
const run2 = applyControlledBehavioralCommerce(args);
if (!validateDeterministicBehavioralReplay(run1, run2)) {
  failed += 1;
  console.error("FAIL validateDeterministicBehavioralReplay");
} else {
  console.log("OK validateDeterministicBehavioralReplay");
}

saveLiveObservabilityRun({ suite: "behavioral-replay", phase: "P5.9", pass: failed === 0 }, "behavioral-replay");

if (failed) process.exit(1);
console.log("\nBehavioral commerce replay passed");

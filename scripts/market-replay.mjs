/**
 * P5.8 — Deterministic market replay.
 * Usage: npm run test:market-replay
 */
import {
  applyControlledMarketIntelligence,
  validateDeterministicMarketReplay,
} from "../lib/market/marketIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MARKET_BOUNDED_ENV } from "./lib/marketRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";

let failed = 0;

for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, MARKET_BOUNDED_ENV);

  const args = {
    products: row.strategyProducts,
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
    preOrderLinks: row.strategyProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };

  clearIntentMemoryStore();
  const run1 = applyControlledMarketIntelligence(args);
  clearIntentMemoryStore();
  const run2 = applyControlledMarketIntelligence(args);

  if (!validateDeterministicMarketReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

clearIntentMemoryStore();
const sample = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], MARKET_BOUNDED_ENV);
const args = {
  products: sample.strategyProducts,
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
  trayId: sample.id,
};
clearIntentMemoryStore();
const run1 = applyControlledMarketIntelligence(args);
clearIntentMemoryStore();
const run2 = applyControlledMarketIntelligence(args);
if (!validateDeterministicMarketReplay(run1, run2)) {
  failed += 1;
  console.error("FAIL validateDeterministicMarketReplay");
} else {
  console.log("OK validateDeterministicMarketReplay");
}

saveLiveObservabilityRun({ suite: "market-replay", phase: "P5.8", pass: failed === 0 }, "market-replay");

if (failed) process.exit(1);
console.log("\nMarket intelligence replay passed");

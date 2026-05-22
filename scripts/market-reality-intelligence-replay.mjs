/**
 * P6.5 — Market reality intelligence replay validation.
 */
import {
  applyControlledMarketRealityIntelligence,
  validateDeterministicMarketRealityReplay,
} from "../lib/marketReality/marketRealityIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV } from "./lib/marketRealityRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, MARKET_REALITY_INTELLIGENCE_BOUNDED_ENV);
  const args = {
    products: row.memorylessLearningProducts,
    query: row.query,
    canonicalQuery: buildCanonicalQuery(row.query),
    governance: row.governance,
    calibration: row.calibration,
    runtime: row.runtime,
    orchestration: row.orchestration,
    memory: row.memory,
    coordination: row.coordination,
    fusion: row.fusion,
    multiObjective: row.multiObjectiveCommerce,
    intent: row.intentCognition,
    strategic: row.adaptiveStrategicRanking,
    memoryless: row.memorylessCommerceLearning,
    preOrderLinks: row.memorylessLearningProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };
  const run1 = applyControlledMarketRealityIntelligence(args);
  clearIntentMemoryStore();
  const run2 = applyControlledMarketRealityIntelligence(args);
  if (!validateDeterministicMarketRealityReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

saveLiveObservabilityRun({ suite: "market-reality-intelligence-replay", phase: "P6.5", pass: failed === 0 }, "market-reality-intelligence-replay");
if (failed) process.exit(1);
console.log("\nMarket reality intelligence replay passed");

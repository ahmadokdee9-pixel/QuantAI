/**
 * P6.9 — Economic world simulation replay validation.
 */
import {
  applyControlledEconomicWorldSimulation,
  validateDeterministicEconomicWorldSimulationReplay,
} from "../lib/economicWorldSimulation/economicWorldSimulationIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV } from "./lib/economicWorldSimulationRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

let failed = 0;
for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV);
  const args = {
    products: row.cognitiveGovernanceProducts,
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
    marketReality: row.marketRealityIntelligence,
    commerceDecision: row.commerceDecisionIntelligence,
    reasoningGraph: row.autonomousCommerceReasoningGraph,
    cognitiveGovernance: row.unifiedCognitiveGovernance,
    preOrderLinks: row.cognitiveGovernanceProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };
  const run1 = applyControlledEconomicWorldSimulation(args);
  clearIntentMemoryStore();
  const run2 = applyControlledEconomicWorldSimulation(args);
  if (!validateDeterministicEconomicWorldSimulationReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

saveLiveObservabilityRun({ suite: "economic-world-simulation-replay", phase: "P6.9", pass: failed === 0 }, "economic-world-simulation-replay");
if (failed) process.exit(1);
console.log("\nEconomic world simulation replay passed");

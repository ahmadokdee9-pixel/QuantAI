/**
 * P6.8 — Unified cognitive governance replay validation.
 */
import {
  applyControlledUnifiedCognitiveGovernance,
  validateDeterministicCognitiveGovernanceReplay,
} from "../lib/cognitiveGovernance/cognitiveGovernanceIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { buildCanonicalQuery } from "../lib/search/canonicalQuery.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV } from "./lib/cognitiveGovernanceRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

let failed = 0;
for (const part of INTENT_LIVE_PARTITIONS) {
  clearIntentMemoryStore();
  const row = runIntentEvaluationPartition(part, UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV);
  const args = {
    products: row.reasoningGraphProducts,
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
    preOrderLinks: row.reasoningGraphProducts.map((p) => p.link || p.title),
    trayId: part.id,
  };
  const run1 = applyControlledUnifiedCognitiveGovernance(args);
  clearIntentMemoryStore();
  const run2 = applyControlledUnifiedCognitiveGovernance(args);
  if (!validateDeterministicCognitiveGovernanceReplay(run1, run2)) {
    failed += 1;
    console.error(`FAIL ${part.id} deterministic replay`);
  } else {
    console.log(`OK ${part.id} deterministic replay`);
  }
}

saveLiveObservabilityRun({ suite: "cognitive-governance-replay", phase: "P6.8", pass: failed === 0 }, "cognitive-governance-replay");
if (failed) process.exit(1);
console.log("\nUnified cognitive governance replay passed");

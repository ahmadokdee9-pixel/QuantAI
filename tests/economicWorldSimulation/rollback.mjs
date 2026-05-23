/**
 * P6.9 — Economic world simulation rollback recovery unit tests.
 */
import { clearIntentMemoryStore } from "../../lib/intent/intentMemory.ts";
import { ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV } from "../../scripts/lib/economicWorldSimulationRunner.mjs";
import { runIntentEvaluationPartition } from "../../scripts/lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "../../scripts/lib/intentLiveObservabilityPartitions.mjs";

let failed = 0;
clearIntentMemoryStore();
const row = runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], {
  ...ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV,
  ECONOMIC_WORLD_SIMULATION_EMERGENCY_SHUTDOWN: "true",
});

if (row.economicWorldSimulation.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown should block mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

const preLinks = row.cognitiveGovernanceProducts.map((p) => p.link || p.title).join("|");
const postLinks = row.economicSimulationProducts.map((p) => p.link || p.title).join("|");
if (preLinks !== postLinks) {
  failed += 1;
  console.error("FAIL rollback did not preserve order");
} else {
  console.log("OK rollback preserves pre-simulation ranking");
}

if (failed) process.exit(1);
console.log("\nEconomic world simulation rollback recovery tests passed");

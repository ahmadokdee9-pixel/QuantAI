/**
 * P6.9 — Economic world simulation stability validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV, runEconomicWorldSimulationPartitions } from "./lib/economicWorldSimulationRunner.mjs";
import { runIntentEvaluationPartition } from "./lib/intentEvaluationRunner.mjs";
import { INTENT_LIVE_PARTITIONS } from "./lib/intentLiveObservabilityPartitions.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, economicWorldSimulation: m } of runEconomicWorldSimulationPartitions(ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV)) {
  const ok = m.simulationScore >= 30 && m.simulationConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} score=${m.simulationScore}`);
  } else {
    console.log(`OK ${trayId} score=${m.simulationScore} confidence=${m.simulationConfidence}`);
  }
}

clearIntentMemoryStore();
const shutdownEnv = { ...ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV, ECONOMIC_WORLD_SIMULATION_EMERGENCY_SHUTDOWN: "true" };
if (runIntentEvaluationPartition(INTENT_LIVE_PARTITIONS[0], shutdownEnv).economicWorldSimulation.mutationApplied) {
  failed += 1;
  console.error("FAIL emergency shutdown blocks mutation");
} else {
  console.log("OK emergency shutdown blocks mutation");
}

saveLiveObservabilityRun({ suite: "economic-world-simulation-stability", phase: "P6.9", pass: failed === 0 }, "economic-world-simulation-stability");
if (failed) process.exit(1);
console.log("\nEconomic world simulation stability passed");

/**
 * P6.9 — Economic world simulation confidence validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV, runEconomicWorldSimulationPartitions } from "./lib/economicWorldSimulationRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, economicWorldSimulation: m } of runEconomicWorldSimulationPartitions(ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV)) {
  const ok = m.simulationConfidence >= 0.3;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} confidence=${m.simulationConfidence}`);
  } else {
    console.log(`OK ${trayId} confidence=${m.simulationConfidence}`);
  }
}

saveLiveObservabilityRun({ suite: "economic-world-simulation-confidence", phase: "P6.9", pass: failed === 0 }, "economic-world-simulation-confidence");
if (failed) process.exit(1);
console.log("\nEconomic world simulation confidence passed");

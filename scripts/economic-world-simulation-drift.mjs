/**
 * P6.9 — Economic world simulation drift validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV, runEconomicWorldSimulationPartitions } from "./lib/economicWorldSimulationRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, economicWorldSimulation: m } of runEconomicWorldSimulationPartitions(ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV)) {
  const topDrift = m.analytics?.topDriftCount ?? 0;
  const ok = typeof m.simulationDelta === "number" && topDrift <= 5;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} delta=${m.simulationDelta} topDrift=${topDrift}`);
  } else {
    console.log(`OK ${trayId} delta=${m.simulationDelta} topDrift=${topDrift}`);
  }
}

saveLiveObservabilityRun({ suite: "economic-world-simulation-drift", phase: "P6.9", pass: failed === 0 }, "economic-world-simulation-drift");
if (failed) process.exit(1);
console.log("\nEconomic world simulation drift passed");

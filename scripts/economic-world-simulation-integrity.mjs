/**
 * P6.9 — Economic world simulation integrity validation.
 */
import {
  isEconomicWorldSimulationEnabled,
  isEconomicWorldSimulationMutationEnabled,
} from "../lib/economicWorldSimulation/economicWorldSimulationIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV, runEconomicWorldSimulationPartitions } from "./lib/economicWorldSimulationRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, economicWorldSimulation: m } of runEconomicWorldSimulationPartitions(ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV)) {
  const ok = typeof m.simulationDelta === "number" && typeof m.monitoring?.replayIntegrityValid === "boolean";
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, m);
  } else {
    console.log(`OK ${trayId} delta=${m.simulationDelta}`);
  }
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.ECONOMIC_WORLD_SIMULATION_ENABLED = "true";
process.env.ECONOMIC_WORLD_SIMULATION_MODE = "bounded-simulation";
delete process.env.ECONOMIC_WORLD_SIMULATION_PROD_APPLY;
delete process.env.ECONOMIC_WORLD_SIMULATION_CANARY_APPLY;
const prodBlocked = isEconomicWorldSimulationEnabled() && !isEconomicWorldSimulationMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production blocked without opt-in");
} else {
  console.log("OK production blocked without opt-in");
}

saveLiveObservabilityRun({ suite: "economic-world-simulation-integrity", phase: "P6.9", pass: failed === 0 }, "economic-world-simulation-integrity");
if (failed) process.exit(1);
console.log("\nEconomic world simulation integrity passed");

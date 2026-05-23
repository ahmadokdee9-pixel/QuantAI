/**
 * P6.9 — Economic world simulation balance validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV, runEconomicWorldSimulationPartitions } from "./lib/economicWorldSimulationRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, economicWorldSimulation: m } of runEconomicWorldSimulationPartitions(ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV)) {
  const ok =
    typeof m.pricingPressureBalance === "number" &&
    typeof m.commerceEcosystemEquilibrium === "number" &&
    m.analytics?.harmonyAnalytics >= 50;
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, m);
  } else {
    console.log(
      `OK ${trayId} pressure=${m.pricingPressureBalance} ecosystem=${m.commerceEcosystemEquilibrium} harmony=${m.analytics.harmonyAnalytics}`
    );
  }
}

saveLiveObservabilityRun({ suite: "economic-world-simulation-balance", phase: "P6.9", pass: failed === 0 }, "economic-world-simulation-balance");
if (failed) process.exit(1);
console.log("\nEconomic world simulation balance passed");

/**
 * P6.9 — Economic world simulation routing validation.
 */
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import { ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV, runEconomicWorldSimulationPartitions } from "./lib/economicWorldSimulationRunner.mjs";

const VALID_LANES = new Set([
  "hold",
  "stabilize",
  "reinforce",
  "compare",
  "economic-check",
  "momentum-check",
  "ecosystem-check",
  "merchant-check",
  "volatility-check",
  "confidence-check",
  "contradiction-check",
  "replay-protect",
  "ranking-safe",
  "system-safe",
  "rollback-safe",
]);

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, economicWorldSimulation: m } of runEconomicWorldSimulationPartitions(ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV)) {
  const ok = VALID_LANES.has(m.routingLane) && typeof m.economicExecutionHash === "string";
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId} lane=${m.routingLane}`);
  } else {
    console.log(`OK ${trayId} lane=${m.routingLane} econ=${m.economicExecutionHash.slice(0, 30)}`);
  }
}

saveLiveObservabilityRun({ suite: "economic-world-simulation-routing", phase: "P6.9", pass: failed === 0 }, "economic-world-simulation-routing");
if (failed) process.exit(1);
console.log("\nEconomic world simulation routing passed");

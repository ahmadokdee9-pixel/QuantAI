/**
 * P6.9 — Economic world simulation audit.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ECONOMIC_WORLD_SIMULATION_MAX_DELTA } from "../lib/economicWorldSimulation/economicWorldSimulationFlags.ts";
import { ECONOMIC_WORLD_SIMULATION_PROFILES } from "../lib/economicWorldSimulation/economicWorldSimulationProfiles.ts";
import {
  isEconomicWorldSimulationEnabled,
  isEconomicWorldSimulationMutationEnabled,
} from "../lib/economicWorldSimulation/economicWorldSimulationIntelligence.ts";
import { clearIntentMemoryStore } from "../lib/intent/intentMemory.ts";
import { saveLiveObservabilityRun } from "./lib/liveObservabilityHistory.mjs";
import {
  ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV,
  ECONOMIC_WORLD_SIMULATION_TELEMETRY_ENV,
  runEconomicWorldSimulationPartitions,
} from "./lib/economicWorldSimulationRunner.mjs";

clearIntentMemoryStore();
let failed = 0;
for (const { trayId, economicWorldSimulation: m } of runEconomicWorldSimulationPartitions(ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV)) {
  const ok =
    m.version === "economic-world-simulation-v1" &&
    m.simulationDelta <= ECONOMIC_WORLD_SIMULATION_MAX_DELTA &&
    m.simulationScore >= 30 &&
    typeof m.mutationApplied === "boolean" &&
    typeof m.simulationSnapshotHash === "string";
  if (!ok) {
    failed += 1;
    console.error(`FAIL ${trayId}`, m);
  } else {
    console.log(`OK ${trayId} score=${m.simulationScore} delta=${m.simulationDelta} mutation=${m.mutationApplied}`);
  }
}

const route = readFileSync(resolve(import.meta.dirname, "../app/api/search/route.ts"), "utf8");
if (!route.includes("economicWorldSimulation") || !route.includes("applyControlledEconomicWorldSimulation")) {
  failed += 1;
  console.error("FAIL meta.economicWorldSimulation not wired");
} else {
  console.log("OK meta.economicWorldSimulation wired");
}

if (ECONOMIC_WORLD_SIMULATION_PROFILES.length !== 6) {
  failed += 1;
  console.error("FAIL economic simulation profiles count");
} else {
  console.log(`OK economic simulation profiles: ${ECONOMIC_WORLD_SIMULATION_PROFILES.length}`);
}

const saved = { ...process.env };
process.env.NODE_ENV = "production";
process.env.ECONOMIC_WORLD_SIMULATION_ENABLED = "true";
process.env.ECONOMIC_WORLD_SIMULATION_MODE = "telemetry-only";
delete process.env.ECONOMIC_WORLD_SIMULATION_PROD_APPLY;
delete process.env.ECONOMIC_WORLD_SIMULATION_CANARY_APPLY;
const prodBlocked = isEconomicWorldSimulationEnabled() && !isEconomicWorldSimulationMutationEnabled();
Object.assign(process.env, saved);

if (!prodBlocked) {
  failed += 1;
  console.error("FAIL production economic simulation mutation blocked");
} else {
  console.log("OK production economic simulation OFF by default");
}

clearIntentMemoryStore();
if (runEconomicWorldSimulationPartitions(ECONOMIC_WORLD_SIMULATION_TELEMETRY_ENV).some((r) => r.economicWorldSimulation.mutationApplied)) {
  failed += 1;
  console.error("FAIL telemetry-only mutated");
} else {
  console.log("OK telemetry-only does not mutate");
}

if (/userProfile|personalizationMemory|autonomousAgent|embeddingSimulation|memoryStorage/.test(route)) {
  failed += 1;
  console.error("FAIL personalization/autonomous agent/memory patterns in search route");
} else {
  console.log("OK no personalization, memory storage, or autonomous agents in route");
}

saveLiveObservabilityRun({ suite: "economic-world-simulation-audit", phase: "P6.9", pass: failed === 0 }, "economic-world-simulation-audit");
if (failed) process.exit(1);
console.log("\nEconomic world simulation audit passed");

/**
 * P6.9 — Economic world simulation evaluation runner.
 */
import { UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV } from "./cognitiveGovernanceRunner.mjs";
import { runIntentEvaluationPartitions } from "./intentEvaluationRunner.mjs";

export const ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV = {
  ...UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV,
  ECONOMIC_WORLD_SIMULATION_ENABLED: "true",
  ECONOMIC_WORLD_SIMULATION_MODE: "bounded-simulation",
};

export const ECONOMIC_WORLD_SIMULATION_TELEMETRY_ENV = {
  ...UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV,
  NODE_ENV: "production",
  ECONOMIC_WORLD_SIMULATION_ENABLED: "true",
  ECONOMIC_WORLD_SIMULATION_MODE: "telemetry-only",
};

export function runEconomicWorldSimulationPartitions(env = ECONOMIC_WORLD_SIMULATION_BOUNDED_ENV) {
  return runIntentEvaluationPartitions(env).map((r) => ({
    trayId: r.trayId,
    economicWorldSimulation: r.economicWorldSimulation,
    unifiedCognitiveGovernance: r.unifiedCognitiveGovernance,
    row: r.row,
  }));
}

export { UNIFIED_COGNITIVE_GOVERNANCE_BOUNDED_ENV };

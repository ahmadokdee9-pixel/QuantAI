/**
 * P6.9 — Economic world simulation flags (default OFF; deterministic only).
 */

export const ECONOMIC_WORLD_SIMULATION_VERSION = "economic-world-simulation-v1" as const;

export const ECONOMIC_WORLD_SIMULATION_MAX_DELTA = 1.0;

export const ECONOMIC_WORLD_SIMULATION_MAX_DRIFT = 1.0;

export const ECONOMIC_WORLD_SIMULATION_MAX_PRESSURE_AMPLIFICATION = 0.75;

export const ECONOMIC_WORLD_SIMULATION_MAX_EQUILIBRIUM_AMPLIFICATION = 0.75;

export type EconomicWorldSimulationMode =
  | "telemetry-only"
  | "passive-simulation"
  | "shadow-simulation"
  | "bounded-simulation"
  | "protected-simulation"
  | "full-safe-simulation";

export type EconomicWorldSimulationRoutingLane =
  | "hold"
  | "stabilize"
  | "reinforce"
  | "compare"
  | "economic-check"
  | "momentum-check"
  | "ecosystem-check"
  | "merchant-check"
  | "volatility-check"
  | "confidence-check"
  | "contradiction-check"
  | "replay-protect"
  | "ranking-safe"
  | "system-safe"
  | "rollback-safe";

const MUTATION_MODES: EconomicWorldSimulationMode[] = ["bounded-simulation", "protected-simulation", "full-safe-simulation"];

export function isEconomicWorldSimulationEnabled(): boolean {
  return process.env.ECONOMIC_WORLD_SIMULATION_ENABLED === "true";
}

export function isEconomicWorldSimulationHardRollback(): boolean {
  return (
    process.env.ECONOMIC_WORLD_SIMULATION_ENABLED === "false" ||
    process.env.COGNITIVE_GOVERNANCE_EMERGENCY_SHUTDOWN === "true" ||
    process.env.AUTONOMOUS_COMMERCE_REASONING_GRAPH_EMERGENCY_SHUTDOWN === "true" ||
    process.env.COMMERCE_DECISION_INTELLIGENCE_EMERGENCY_SHUTDOWN === "true" ||
    process.env.MARKET_REALITY_INTELLIGENCE_EMERGENCY_SHUTDOWN === "true" ||
    process.env.MEMORYLESS_COMMERCE_LEARNING_EMERGENCY_SHUTDOWN === "true" ||
    process.env.ADAPTIVE_STRATEGIC_RANKING_EMERGENCY_SHUTDOWN === "true" ||
    process.env.MULTI_OBJECTIVE_COMMERCE_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_COGNITION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.COGNITION_ENGINE_EMERGENCY_SHUTDOWN === "true" ||
    process.env.BEHAVIORAL_COMMERCE_EMERGENCY_SHUTDOWN === "true" ||
    process.env.MARKET_INTELLIGENCE_EMERGENCY_SHUTDOWN === "true" ||
    process.env.STRATEGY_INTELLIGENCE_EMERGENCY_SHUTDOWN === "true" ||
    process.env.DECISION_INTELLIGENCE_EMERGENCY_SHUTDOWN === "true" ||
    process.env.ADAPTIVE_REASONING_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_FUSION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_COORDINATION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_MEMORY_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_ORCHESTRATION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_RUNTIME_EMERGENCY_SHUTDOWN === "true"
  );
}

export function isEconomicWorldSimulationEmergencyShutdown(): boolean {
  return process.env.ECONOMIC_WORLD_SIMULATION_EMERGENCY_SHUTDOWN === "true";
}

export function resolveEconomicWorldSimulationMode(): EconomicWorldSimulationMode {
  const raw = (process.env.ECONOMIC_WORLD_SIMULATION_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-simulation") return "passive-simulation";
  if (raw === "shadow-simulation") return "shadow-simulation";
  if (raw === "bounded-simulation") return "bounded-simulation";
  if (raw === "protected-simulation") return "protected-simulation";
  if (raw === "full-safe-simulation") return "full-safe-simulation";
  return "telemetry-only";
}

export function isEconomicWorldSimulationProdOptIn(): boolean {
  return process.env.ECONOMIC_WORLD_SIMULATION_PROD_APPLY === "true";
}

export function isEconomicWorldSimulationCanaryOptIn(): boolean {
  return process.env.ECONOMIC_WORLD_SIMULATION_CANARY_APPLY === "true";
}

export function isEconomicWorldSimulationEnvironmentAllowed(): boolean {
  if (isEconomicWorldSimulationHardRollback() || isEconomicWorldSimulationEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isEconomicWorldSimulationProdOptIn() || isEconomicWorldSimulationCanaryOptIn();
}

export function isEconomicWorldSimulationMutationEnabled(mode?: EconomicWorldSimulationMode): boolean {
  const resolved = mode ?? resolveEconomicWorldSimulationMode();
  if (!isEconomicWorldSimulationEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isEconomicWorldSimulationEnvironmentAllowed()) return false;
  return true;
}

export function isEconomicWorldSimulationShadowMode(mode?: EconomicWorldSimulationMode): boolean {
  const resolved = mode ?? resolveEconomicWorldSimulationMode();
  return resolved === "shadow-simulation";
}

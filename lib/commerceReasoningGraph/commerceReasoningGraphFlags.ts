/**
 * P6.7 — Autonomous commerce reasoning graph flags (default OFF; deterministic graph only).
 */

export const AUTONOMOUS_COMMERCE_REASONING_GRAPH_VERSION = "autonomous-commerce-reasoning-graph-v1" as const;

export const COMMERCE_REASONING_GRAPH_MAX_DELTA = 1.0;

export const COMMERCE_REASONING_GRAPH_MAX_DRIFT = 1.0;

export const COMMERCE_REASONING_GRAPH_MAX_PATH_AMPLIFICATION = 0.75;

export const COMMERCE_REASONING_GRAPH_MAX_CAUSAL_AMPLIFICATION = 0.75;

export const COMMERCE_REASONING_GRAPH_MAX_PATH_DEPTH = 6;

export type AutonomousCommerceReasoningGraphMode =
  | "telemetry-only"
  | "passive-graph"
  | "shadow-graph"
  | "bounded-graph"
  | "protected-graph"
  | "full-safe-graph";

export type CommerceReasoningGraphRoutingLane =
  | "hold"
  | "stabilize"
  | "reinforce"
  | "structure-check"
  | "circular-check"
  | "branch-check"
  | "causal-check"
  | "drift-check"
  | "causality-check"
  | "path-check"
  | "graph-safe"
  | "replay-protect";

const MUTATION_MODES: AutonomousCommerceReasoningGraphMode[] = ["bounded-graph", "protected-graph", "full-safe-graph"];

export function isAutonomousCommerceReasoningGraphEnabled(): boolean {
  return process.env.AUTONOMOUS_COMMERCE_REASONING_GRAPH_ENABLED === "true";
}

export function isAutonomousCommerceReasoningGraphHardRollback(): boolean {
  return (
    process.env.AUTONOMOUS_COMMERCE_REASONING_GRAPH_ENABLED === "false" ||
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

export function isAutonomousCommerceReasoningGraphEmergencyShutdown(): boolean {
  return process.env.AUTONOMOUS_COMMERCE_REASONING_GRAPH_EMERGENCY_SHUTDOWN === "true";
}

export function resolveAutonomousCommerceReasoningGraphMode(): AutonomousCommerceReasoningGraphMode {
  const raw = (process.env.AUTONOMOUS_COMMERCE_REASONING_GRAPH_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-graph") return "passive-graph";
  if (raw === "shadow-graph") return "shadow-graph";
  if (raw === "bounded-graph") return "bounded-graph";
  if (raw === "protected-graph") return "protected-graph";
  if (raw === "full-safe-graph") return "full-safe-graph";
  return "telemetry-only";
}

export function isAutonomousCommerceReasoningGraphProdOptIn(): boolean {
  return process.env.AUTONOMOUS_COMMERCE_REASONING_GRAPH_PROD_APPLY === "true";
}

export function isAutonomousCommerceReasoningGraphCanaryOptIn(): boolean {
  return process.env.AUTONOMOUS_COMMERCE_REASONING_GRAPH_CANARY_APPLY === "true";
}

export function isAutonomousCommerceReasoningGraphEnvironmentAllowed(): boolean {
  if (isAutonomousCommerceReasoningGraphHardRollback() || isAutonomousCommerceReasoningGraphEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isAutonomousCommerceReasoningGraphProdOptIn() || isAutonomousCommerceReasoningGraphCanaryOptIn();
}

export function isAutonomousCommerceReasoningGraphMutationEnabled(mode?: AutonomousCommerceReasoningGraphMode): boolean {
  const resolved = mode ?? resolveAutonomousCommerceReasoningGraphMode();
  if (!isAutonomousCommerceReasoningGraphEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isAutonomousCommerceReasoningGraphEnvironmentAllowed()) return false;
  return true;
}

export function isAutonomousCommerceReasoningGraphShadowMode(mode?: AutonomousCommerceReasoningGraphMode): boolean {
  const resolved = mode ?? resolveAutonomousCommerceReasoningGraphMode();
  return resolved === "shadow-graph";
}

/**
 * P6.8 — Unified cognitive governance flags (default OFF; deterministic only).
 */

export const UNIFIED_COGNITIVE_GOVERNANCE_VERSION = "unified-cognitive-governance-v1" as const;

export const COGNITIVE_GOVERNANCE_MAX_DELTA = 1.0;

export const COGNITIVE_GOVERNANCE_MAX_DRIFT = 1.0;

export const COGNITIVE_GOVERNANCE_MAX_INFLUENCE_AMPLIFICATION = 0.75;

export const COGNITIVE_GOVERNANCE_MAX_EQUILIBRIUM_AMPLIFICATION = 0.75;

export type UnifiedCognitiveGovernanceMode =
  | "telemetry-only"
  | "passive-governance"
  | "shadow-governance"
  | "bounded-governance"
  | "protected-governance"
  | "full-safe-governance";

export type CognitiveGovernanceRoutingLane =
  | "hold"
  | "stabilize"
  | "reinforce"
  | "compare"
  | "governance-check"
  | "equilibrium-check"
  | "confidence-check"
  | "causality-check"
  | "contradiction-check"
  | "replay-protect"
  | "ranking-safe"
  | "system-safe"
  | "rollback-safe";

const MUTATION_MODES: UnifiedCognitiveGovernanceMode[] = ["bounded-governance", "protected-governance", "full-safe-governance"];

export function isUnifiedCognitiveGovernanceEnabled(): boolean {
  return process.env.COGNITIVE_GOVERNANCE_ENABLED === "true";
}

export function isUnifiedCognitiveGovernanceHardRollback(): boolean {
  return (
    process.env.COGNITIVE_GOVERNANCE_ENABLED === "false" ||
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

export function isUnifiedCognitiveGovernanceEmergencyShutdown(): boolean {
  return process.env.COGNITIVE_GOVERNANCE_EMERGENCY_SHUTDOWN === "true";
}

export function resolveUnifiedCognitiveGovernanceMode(): UnifiedCognitiveGovernanceMode {
  const raw = (process.env.COGNITIVE_GOVERNANCE_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-governance") return "passive-governance";
  if (raw === "shadow-governance") return "shadow-governance";
  if (raw === "bounded-governance") return "bounded-governance";
  if (raw === "protected-governance") return "protected-governance";
  if (raw === "full-safe-governance") return "full-safe-governance";
  return "telemetry-only";
}

export function isUnifiedCognitiveGovernanceProdOptIn(): boolean {
  return process.env.COGNITIVE_GOVERNANCE_PROD_APPLY === "true";
}

export function isUnifiedCognitiveGovernanceCanaryOptIn(): boolean {
  return process.env.COGNITIVE_GOVERNANCE_CANARY_APPLY === "true";
}

export function isUnifiedCognitiveGovernanceEnvironmentAllowed(): boolean {
  if (isUnifiedCognitiveGovernanceHardRollback() || isUnifiedCognitiveGovernanceEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isUnifiedCognitiveGovernanceProdOptIn() || isUnifiedCognitiveGovernanceCanaryOptIn();
}

export function isUnifiedCognitiveGovernanceMutationEnabled(mode?: UnifiedCognitiveGovernanceMode): boolean {
  const resolved = mode ?? resolveUnifiedCognitiveGovernanceMode();
  if (!isUnifiedCognitiveGovernanceEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isUnifiedCognitiveGovernanceEnvironmentAllowed()) return false;
  return true;
}

export function isUnifiedCognitiveGovernanceShadowMode(mode?: UnifiedCognitiveGovernanceMode): boolean {
  const resolved = mode ?? resolveUnifiedCognitiveGovernanceMode();
  return resolved === "shadow-governance";
}

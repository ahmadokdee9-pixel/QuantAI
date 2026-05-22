/**
 * P6.4 — Memoryless commerce learning flags (default OFF; no user memory).
 */

export const MEMORYLESS_COMMERCE_LEARNING_VERSION = "memoryless-commerce-learning-v1" as const;

export const MEMORYLESS_LEARNING_MAX_DELTA = 1.0;

export const MEMORYLESS_LEARNING_MAX_DRIFT = 1.0;

export const MEMORYLESS_LEARNING_MAX_CONTINUITY_AMPLIFICATION = 0.75;

export const MEMORYLESS_LEARNING_MAX_STABILIZATION_AMPLIFICATION = 0.75;

export type MemorylessCommerceLearningMode =
  | "telemetry-only"
  | "passive-learning"
  | "shadow-learning"
  | "bounded-learning"
  | "protected-learning"
  | "full-safe-learning";

export type MemorylessLearningRoutingLane =
  | "hold"
  | "stabilize"
  | "reinforce"
  | "drift-check"
  | "fatigue-check"
  | "confidence-check"
  | "oscillation-check"
  | "trust-check"
  | "conversion-check"
  | "continuity-safe"
  | "replay-protect";

const MUTATION_MODES: MemorylessCommerceLearningMode[] = ["bounded-learning", "protected-learning", "full-safe-learning"];

export function isMemorylessCommerceLearningEnabled(): boolean {
  return process.env.MEMORYLESS_COMMERCE_LEARNING_ENABLED === "true";
}

export function isMemorylessCommerceLearningHardRollback(): boolean {
  return (
    process.env.MEMORYLESS_COMMERCE_LEARNING_ENABLED === "false" ||
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

export function isMemorylessCommerceLearningEmergencyShutdown(): boolean {
  return process.env.MEMORYLESS_COMMERCE_LEARNING_EMERGENCY_SHUTDOWN === "true";
}

export function resolveMemorylessCommerceLearningMode(): MemorylessCommerceLearningMode {
  const raw = (process.env.MEMORYLESS_COMMERCE_LEARNING_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-learning") return "passive-learning";
  if (raw === "shadow-learning") return "shadow-learning";
  if (raw === "bounded-learning") return "bounded-learning";
  if (raw === "protected-learning") return "protected-learning";
  if (raw === "full-safe-learning") return "full-safe-learning";
  return "telemetry-only";
}

export function isMemorylessCommerceLearningProdOptIn(): boolean {
  return process.env.MEMORYLESS_COMMERCE_LEARNING_PROD_APPLY === "true";
}

export function isMemorylessCommerceLearningCanaryOptIn(): boolean {
  return process.env.MEMORYLESS_COMMERCE_LEARNING_CANARY_APPLY === "true";
}

export function isMemorylessCommerceLearningEnvironmentAllowed(): boolean {
  if (isMemorylessCommerceLearningHardRollback() || isMemorylessCommerceLearningEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isMemorylessCommerceLearningProdOptIn() || isMemorylessCommerceLearningCanaryOptIn();
}

export function isMemorylessCommerceLearningMutationEnabled(mode?: MemorylessCommerceLearningMode): boolean {
  const resolved = mode ?? resolveMemorylessCommerceLearningMode();
  if (!isMemorylessCommerceLearningEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isMemorylessCommerceLearningEnvironmentAllowed()) return false;
  return true;
}

export function isMemorylessCommerceLearningShadowMode(mode?: MemorylessCommerceLearningMode): boolean {
  const resolved = mode ?? resolveMemorylessCommerceLearningMode();
  return resolved === "shadow-learning";
}

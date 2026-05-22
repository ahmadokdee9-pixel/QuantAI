/**
 * P6.2 — Multi-objective commerce flags (default OFF; no personalization memory).
 */

export const MULTI_OBJECTIVE_COMMERCE_VERSION = "multi-objective-commerce-v1" as const;

export const MULTI_OBJECTIVE_MAX_DELTA = 1.0;

export const MULTI_OBJECTIVE_MAX_DRIFT = 1.0;

export const MULTI_OBJECTIVE_MAX_CONVERSION_AMPLIFICATION = 0.8;

export const MULTI_OBJECTIVE_MAX_TRUST_AMPLIFICATION = 0.8;

export const MULTI_OBJECTIVE_MAX_QUALITY_AMPLIFICATION = 0.8;

export type MultiObjectiveCommerceMode =
  | "telemetry-only"
  | "passive-multi-objective"
  | "shadow-multi-objective"
  | "bounded-multi-objective"
  | "protected-multi-objective"
  | "full-safe-multi-objective";

export type MultiObjectiveRoutingLane =
  | "hold"
  | "stabilize"
  | "reinforce"
  | "compare"
  | "strategic-balance"
  | "conversion-check"
  | "momentum-check"
  | "behavior-check"
  | "contradiction-check"
  | "objective-safe"
  | "replay-protect";

const MUTATION_MODES: MultiObjectiveCommerceMode[] = [
  "bounded-multi-objective",
  "protected-multi-objective",
  "full-safe-multi-objective",
];

export function isMultiObjectiveCommerceEnabled(): boolean {
  return process.env.MULTI_OBJECTIVE_COMMERCE_ENABLED === "true";
}

export function isMultiObjectiveCommerceHardRollback(): boolean {
  return (
    process.env.MULTI_OBJECTIVE_COMMERCE_ENABLED === "false" ||
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

export function isMultiObjectiveCommerceEmergencyShutdown(): boolean {
  return process.env.MULTI_OBJECTIVE_COMMERCE_EMERGENCY_SHUTDOWN === "true";
}

export function resolveMultiObjectiveCommerceMode(): MultiObjectiveCommerceMode {
  const raw = (process.env.MULTI_OBJECTIVE_COMMERCE_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-multi-objective") return "passive-multi-objective";
  if (raw === "shadow-multi-objective") return "shadow-multi-objective";
  if (raw === "bounded-multi-objective") return "bounded-multi-objective";
  if (raw === "protected-multi-objective") return "protected-multi-objective";
  if (raw === "full-safe-multi-objective") return "full-safe-multi-objective";
  return "telemetry-only";
}

export function isMultiObjectiveCommerceProdOptIn(): boolean {
  return process.env.MULTI_OBJECTIVE_COMMERCE_PROD_APPLY === "true";
}

export function isMultiObjectiveCommerceCanaryOptIn(): boolean {
  return process.env.MULTI_OBJECTIVE_COMMERCE_CANARY_APPLY === "true";
}

export function isMultiObjectiveCommerceEnvironmentAllowed(): boolean {
  if (isMultiObjectiveCommerceHardRollback() || isMultiObjectiveCommerceEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isMultiObjectiveCommerceProdOptIn() || isMultiObjectiveCommerceCanaryOptIn();
}

export function isMultiObjectiveCommerceMutationEnabled(mode?: MultiObjectiveCommerceMode): boolean {
  const resolved = mode ?? resolveMultiObjectiveCommerceMode();
  if (!isMultiObjectiveCommerceEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isMultiObjectiveCommerceEnvironmentAllowed()) return false;
  return true;
}

export function isMultiObjectiveCommerceShadowMode(mode?: MultiObjectiveCommerceMode): boolean {
  const resolved = mode ?? resolveMultiObjectiveCommerceMode();
  return resolved === "shadow-multi-objective";
}

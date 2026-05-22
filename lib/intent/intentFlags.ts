/**
 * P6.1 — Intent cognition flags (default OFF; no personalization memory).
 */

export const INTENT_COGNITION_VERSION = "intent-cognition-v1" as const;

export const INTENT_COGNITION_MAX_DELTA = 1.0;

export const INTENT_COGNITION_MAX_DRIFT = 1.0;

export const INTENT_COGNITION_MAX_READINESS_AMPLIFICATION = 0.8;

export const INTENT_COGNITION_MAX_TRUST_AMPLIFICATION = 0.8;

export const INTENT_COGNITION_MAX_AESTHETIC_AMPLIFICATION = 0.8;

export type IntentCognitionMode =
  | "telemetry-only"
  | "passive-intent"
  | "shadow-intent"
  | "bounded-intent"
  | "protected-intent"
  | "full-safe-intent";

export type IntentCognitionRoutingLane =
  | "hold"
  | "stabilize"
  | "reinforce"
  | "compare"
  | "strategic-balance"
  | "conversion-check"
  | "momentum-check"
  | "behavior-check"
  | "contradiction-check"
  | "intent-safe"
  | "replay-protect";

const MUTATION_MODES: IntentCognitionMode[] = ["bounded-intent", "protected-intent", "full-safe-intent"];

export function isIntentCognitionEnabled(): boolean {
  return process.env.INTENT_COGNITION_ENABLED === "true";
}

export function isIntentCognitionHardRollback(): boolean {
  return (
    process.env.INTENT_COGNITION_ENABLED === "false" ||
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

export function isIntentCognitionEmergencyShutdown(): boolean {
  return process.env.INTENT_COGNITION_EMERGENCY_SHUTDOWN === "true";
}

export function resolveIntentCognitionMode(): IntentCognitionMode {
  const raw = (process.env.INTENT_COGNITION_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-intent") return "passive-intent";
  if (raw === "shadow-intent") return "shadow-intent";
  if (raw === "bounded-intent") return "bounded-intent";
  if (raw === "protected-intent") return "protected-intent";
  if (raw === "full-safe-intent") return "full-safe-intent";
  return "telemetry-only";
}

export function isIntentCognitionProdOptIn(): boolean {
  return process.env.INTENT_COGNITION_PROD_APPLY === "true";
}

export function isIntentCognitionCanaryOptIn(): boolean {
  return process.env.INTENT_COGNITION_CANARY_APPLY === "true";
}

export function isIntentCognitionEnvironmentAllowed(): boolean {
  if (isIntentCognitionHardRollback() || isIntentCognitionEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isIntentCognitionProdOptIn() || isIntentCognitionCanaryOptIn();
}

export function isIntentCognitionMutationEnabled(mode?: IntentCognitionMode): boolean {
  const resolved = mode ?? resolveIntentCognitionMode();
  if (!isIntentCognitionEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isIntentCognitionEnvironmentAllowed()) return false;
  return true;
}

export function isIntentCognitionShadowMode(mode?: IntentCognitionMode): boolean {
  const resolved = mode ?? resolveIntentCognitionMode();
  return resolved === "shadow-intent";
}

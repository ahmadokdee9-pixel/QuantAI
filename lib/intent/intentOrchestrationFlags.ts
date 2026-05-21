/**
 * P5.1 — Adaptive bounded intelligence orchestration flags (default OFF in production).
 */

export const INTENT_ORCHESTRATION_VERSION = "intent-orchestration-v1" as const;

export const INTENT_ORCH_MAX_DELTA = 2;

export const INTENT_ORCH_MAX_DRIFT = 2;

export const INTENT_ORCH_MAX_TRUST_REBALANCE = 1.5;

export const INTENT_ORCH_MAX_SUPPRESSION_CORRECTION = 1.5;

export const INTENT_ORCH_MAX_DIVERSITY_INTERVENTION = 1.5;

export type IntentOrchestrationMode =
  | "telemetry-only"
  | "passive-balance"
  | "shadow-orchestration"
  | "bounded-orchestration"
  | "protected-runtime"
  | "full-safe-orchestration";

const MUTATION_MODES: IntentOrchestrationMode[] = [
  "bounded-orchestration",
  "protected-runtime",
  "full-safe-orchestration",
];

export function isIntentOrchestrationEnabled(): boolean {
  return process.env.INTENT_ORCHESTRATION_ENABLED === "true";
}

export function isIntentOrchestrationHardRollback(): boolean {
  return (
    process.env.INTENT_ORCHESTRATION_ENABLED === "false" ||
    process.env.INTENT_RUNTIME_EMERGENCY_SHUTDOWN === "true"
  );
}

export function isIntentOrchestrationEmergencyShutdown(): boolean {
  return process.env.INTENT_ORCHESTRATION_EMERGENCY_SHUTDOWN === "true";
}

export function resolveIntentOrchestrationMode(): IntentOrchestrationMode {
  const raw = (process.env.INTENT_ORCHESTRATION_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-balance") return "passive-balance";
  if (raw === "shadow-orchestration") return "shadow-orchestration";
  if (raw === "bounded-orchestration") return "bounded-orchestration";
  if (raw === "protected-runtime") return "protected-runtime";
  if (raw === "full-safe-orchestration") return "full-safe-orchestration";
  return "telemetry-only";
}

export function isIntentOrchestrationProdOptIn(): boolean {
  return process.env.INTENT_ORCHESTRATION_PROD_APPLY === "true";
}

export function isIntentOrchestrationCanaryOptIn(): boolean {
  return process.env.INTENT_ORCHESTRATION_CANARY_APPLY === "true";
}

export function isIntentOrchestrationEnvironmentAllowed(): boolean {
  if (isIntentOrchestrationHardRollback() || isIntentOrchestrationEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isIntentOrchestrationProdOptIn() || isIntentOrchestrationCanaryOptIn();
}

export function isIntentOrchestrationMutationEnabled(mode?: IntentOrchestrationMode): boolean {
  const resolved = mode ?? resolveIntentOrchestrationMode();
  if (!isIntentOrchestrationEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isIntentOrchestrationEnvironmentAllowed()) return false;
  return true;
}

export function isIntentOrchestrationShadowMode(mode?: IntentOrchestrationMode): boolean {
  const resolved = mode ?? resolveIntentOrchestrationMode();
  return resolved === "shadow-orchestration";
}

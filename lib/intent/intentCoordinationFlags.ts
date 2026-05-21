/**
 * P5.3 — Cross-intent coordination flags (default OFF; no personalization).
 */

export const INTENT_COORDINATION_VERSION = "intent-coordination-v1" as const;

export const INTENT_COORDINATION_MAX_DELTA = 1.25;

export const INTENT_COORDINATION_MAX_DRIFT = 1.25;

export const INTENT_COORDINATION_MAX_INTENT_REBALANCE = 1.1;

export const INTENT_COORDINATION_MAX_TRUST_PROPAGATION = 1;

export const INTENT_COORDINATION_MAX_SUPPRESSION_REBALANCE = 1;

export const INTENT_COORDINATION_MAX_DIVERSITY_COORDINATION = 1;

export type IntentCoordinationMode =
  | "telemetry-only"
  | "passive-coordination"
  | "shadow-coordination"
  | "bounded-coordination"
  | "protected-coordination"
  | "full-safe-coordination";

const MUTATION_MODES: IntentCoordinationMode[] = [
  "bounded-coordination",
  "protected-coordination",
  "full-safe-coordination",
];

export function isIntentCoordinationEnabled(): boolean {
  return process.env.INTENT_COORDINATION_ENABLED === "true";
}

export function isIntentCoordinationHardRollback(): boolean {
  return (
    process.env.INTENT_COORDINATION_ENABLED === "false" ||
    process.env.INTENT_MEMORY_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_ORCHESTRATION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_RUNTIME_EMERGENCY_SHUTDOWN === "true"
  );
}

export function isIntentCoordinationEmergencyShutdown(): boolean {
  return process.env.INTENT_COORDINATION_EMERGENCY_SHUTDOWN === "true";
}

export function resolveIntentCoordinationMode(): IntentCoordinationMode {
  const raw = (process.env.INTENT_COORDINATION_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-coordination") return "passive-coordination";
  if (raw === "shadow-coordination") return "shadow-coordination";
  if (raw === "bounded-coordination") return "bounded-coordination";
  if (raw === "protected-coordination") return "protected-coordination";
  if (raw === "full-safe-coordination") return "full-safe-coordination";
  return "telemetry-only";
}

export function isIntentCoordinationProdOptIn(): boolean {
  return process.env.INTENT_COORDINATION_PROD_APPLY === "true";
}

export function isIntentCoordinationCanaryOptIn(): boolean {
  return process.env.INTENT_COORDINATION_CANARY_APPLY === "true";
}

export function isIntentCoordinationEnvironmentAllowed(): boolean {
  if (isIntentCoordinationHardRollback() || isIntentCoordinationEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isIntentCoordinationProdOptIn() || isIntentCoordinationCanaryOptIn();
}

export function isIntentCoordinationMutationEnabled(mode?: IntentCoordinationMode): boolean {
  const resolved = mode ?? resolveIntentCoordinationMode();
  if (!isIntentCoordinationEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isIntentCoordinationEnvironmentAllowed()) return false;
  return true;
}

export function isIntentCoordinationShadowMode(mode?: IntentCoordinationMode): boolean {
  const resolved = mode ?? resolveIntentCoordinationMode();
  return resolved === "shadow-coordination";
}

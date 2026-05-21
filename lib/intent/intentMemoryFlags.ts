/**
 * P5.2 — Deterministic intelligence memory flags (default OFF; no personalization).
 */

export const INTENT_MEMORY_VERSION = "intent-memory-v1" as const;

export const INTENT_MEMORY_MAX_DELTA = 1.5;

export const INTENT_MEMORY_MAX_DRIFT = 1.5;

export const INTENT_MEMORY_MAX_CONTINUITY_BOOST = 1.2;

export const INTENT_MEMORY_MAX_TRUST_REINFORCEMENT = 1;

export const INTENT_MEMORY_MAX_SUPPRESSION_RECOVERY = 1;

export const INTENT_MEMORY_MAX_DIVERSITY_STABILIZATION = 1;

export type IntentMemoryMode =
  | "telemetry-only"
  | "passive-memory"
  | "shadow-memory"
  | "bounded-memory"
  | "protected-memory-runtime"
  | "full-safe-memory";

const MUTATION_MODES: IntentMemoryMode[] = [
  "bounded-memory",
  "protected-memory-runtime",
  "full-safe-memory",
];

/** Master switch — default off unless INTENT_MEMORY_ENABLED=true. */
export function isIntentMemoryEnabled(): boolean {
  return process.env.INTENT_MEMORY_ENABLED === "true";
}

export function isIntentMemoryHardRollback(): boolean {
  return (
    process.env.INTENT_MEMORY_ENABLED === "false" ||
    process.env.INTENT_ORCHESTRATION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_RUNTIME_EMERGENCY_SHUTDOWN === "true"
  );
}

export function isIntentMemoryEmergencyShutdown(): boolean {
  return process.env.INTENT_MEMORY_EMERGENCY_SHUTDOWN === "true";
}

export function resolveIntentMemoryMode(): IntentMemoryMode {
  const raw = (process.env.INTENT_MEMORY_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-memory") return "passive-memory";
  if (raw === "shadow-memory") return "shadow-memory";
  if (raw === "bounded-memory") return "bounded-memory";
  if (raw === "protected-memory-runtime") return "protected-memory-runtime";
  if (raw === "full-safe-memory") return "full-safe-memory";
  return "telemetry-only";
}

export function isIntentMemoryProdOptIn(): boolean {
  return process.env.INTENT_MEMORY_PROD_APPLY === "true";
}

export function isIntentMemoryCanaryOptIn(): boolean {
  return process.env.INTENT_MEMORY_CANARY_APPLY === "true";
}

export function isIntentMemoryEnvironmentAllowed(): boolean {
  if (isIntentMemoryHardRollback() || isIntentMemoryEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isIntentMemoryProdOptIn() || isIntentMemoryCanaryOptIn();
}

export function isIntentMemoryMutationEnabled(mode?: IntentMemoryMode): boolean {
  const resolved = mode ?? resolveIntentMemoryMode();
  if (!isIntentMemoryEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isIntentMemoryEnvironmentAllowed()) return false;
  return true;
}

export function isIntentMemoryShadowMode(mode?: IntentMemoryMode): boolean {
  const resolved = mode ?? resolveIntentMemoryMode();
  return resolved === "shadow-memory";
}

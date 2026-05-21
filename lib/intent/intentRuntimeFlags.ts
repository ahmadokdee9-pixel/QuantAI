/**
 * P5.0 — Controlled intent runtime activation flags (default OFF in production).
 */

export const INTENT_RUNTIME_VERSION = "intent-runtime-v1" as const;

export const INTENT_RUNTIME_MAX_DELTA = 3;

export const INTENT_RUNTIME_TRUST_BOOST_CAP = 2;

export const INTENT_RUNTIME_SUPPRESSION_CAP = 3;

export const INTENT_RUNTIME_COMPARISON_BOOST_CAP = 2;

export const INTENT_RUNTIME_DIVERSITY_REBALANCE_CAP = 2;

export const INTENT_RUNTIME_HARD_ROLLBACK_DRIFT = 3;

export type IntentRuntimeMode =
  | "telemetry-only"
  | "shadow-apply"
  | "bounded-apply"
  | "protected-canary"
  | "full-safe-runtime";

const MUTATION_MODES: IntentRuntimeMode[] = [
  "bounded-apply",
  "protected-canary",
  "full-safe-runtime",
];

/** Master switch — default off unless INTENT_RUNTIME_ENABLED=true. */
export function isIntentRuntimeEnabled(): boolean {
  return process.env.INTENT_RUNTIME_ENABLED === "true";
}

export function isIntentRuntimeHardRollback(): boolean {
  return (
    process.env.INTENT_RUNTIME_ENABLED === "false" ||
    process.env.INTENT_INTELLIGENCE_APPLY_ENABLED === "false"
  );
}

export function isIntentRuntimeEmergencyShutdown(): boolean {
  return process.env.INTENT_RUNTIME_EMERGENCY_SHUTDOWN === "true";
}

export function resolveIntentRuntimeMode(): IntentRuntimeMode {
  const raw = (process.env.INTENT_RUNTIME_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "shadow-apply") return "shadow-apply";
  if (raw === "bounded-apply") return "bounded-apply";
  if (raw === "protected-canary") return "protected-canary";
  if (raw === "full-safe-runtime") return "full-safe-runtime";
  return "telemetry-only";
}

export function isIntentRuntimeProdOptIn(): boolean {
  return process.env.INTENT_RUNTIME_PROD_APPLY === "true";
}

export function isIntentRuntimeCanaryOptIn(): boolean {
  return process.env.INTENT_RUNTIME_CANARY_APPLY === "true";
}

export function isIntentRuntimeEnvironmentAllowed(): boolean {
  if (isIntentRuntimeHardRollback() || isIntentRuntimeEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isIntentRuntimeProdOptIn() || isIntentRuntimeCanaryOptIn();
}

export function isIntentRuntimeMutationEnabled(mode?: IntentRuntimeMode): boolean {
  const resolved = mode ?? resolveIntentRuntimeMode();
  if (!isIntentRuntimeEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isIntentRuntimeEnvironmentAllowed()) return false;
  return true;
}

export function isIntentRuntimeShadowMode(mode?: IntentRuntimeMode): boolean {
  const resolved = mode ?? resolveIntentRuntimeMode();
  return resolved === "shadow-apply";
}

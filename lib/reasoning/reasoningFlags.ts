/**
 * P5.5 — Adaptive commerce reasoning flags (default OFF; no personalization).
 */

export const ADAPTIVE_REASONING_VERSION = "adaptive-reasoning-v1" as const;

export const REASONING_MAX_DELTA = 1.0;

export const REASONING_MAX_DRIFT = 1.0;

export const REASONING_MAX_CONFIDENCE_AMPLIFICATION = 0.85;

export const REASONING_MAX_TRUST_AMPLIFICATION = 0.8;

export const REASONING_MAX_PREMIUM_AMPLIFICATION = 0.75;

export type AdaptiveReasoningMode =
  | "telemetry-only"
  | "passive-reasoning"
  | "shadow-reasoning"
  | "bounded-reasoning"
  | "protected-reasoning"
  | "full-safe-reasoning";

export type ReasoningRoutingLane =
  | "hold"
  | "stabilize"
  | "reinforce"
  | "recover"
  | "compare"
  | "confidence-check"
  | "reasoning-balance"
  | "replay-protect";

const MUTATION_MODES: AdaptiveReasoningMode[] = [
  "bounded-reasoning",
  "protected-reasoning",
  "full-safe-reasoning",
];

export function isAdaptiveReasoningEnabled(): boolean {
  return process.env.ADAPTIVE_REASONING_ENABLED === "true";
}

export function isAdaptiveReasoningHardRollback(): boolean {
  return (
    process.env.ADAPTIVE_REASONING_ENABLED === "false" ||
    process.env.INTENT_FUSION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_COORDINATION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_MEMORY_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_ORCHESTRATION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_RUNTIME_EMERGENCY_SHUTDOWN === "true"
  );
}

export function isAdaptiveReasoningEmergencyShutdown(): boolean {
  return process.env.ADAPTIVE_REASONING_EMERGENCY_SHUTDOWN === "true";
}

export function resolveAdaptiveReasoningMode(): AdaptiveReasoningMode {
  const raw = (process.env.ADAPTIVE_REASONING_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-reasoning") return "passive-reasoning";
  if (raw === "shadow-reasoning") return "shadow-reasoning";
  if (raw === "bounded-reasoning") return "bounded-reasoning";
  if (raw === "protected-reasoning") return "protected-reasoning";
  if (raw === "full-safe-reasoning") return "full-safe-reasoning";
  return "telemetry-only";
}

export function isAdaptiveReasoningProdOptIn(): boolean {
  return process.env.ADAPTIVE_REASONING_PROD_APPLY === "true";
}

export function isAdaptiveReasoningCanaryOptIn(): boolean {
  return process.env.ADAPTIVE_REASONING_CANARY_APPLY === "true";
}

export function isAdaptiveReasoningEnvironmentAllowed(): boolean {
  if (isAdaptiveReasoningHardRollback() || isAdaptiveReasoningEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isAdaptiveReasoningProdOptIn() || isAdaptiveReasoningCanaryOptIn();
}

export function isAdaptiveReasoningMutationEnabled(mode?: AdaptiveReasoningMode): boolean {
  const resolved = mode ?? resolveAdaptiveReasoningMode();
  if (!isAdaptiveReasoningEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isAdaptiveReasoningEnvironmentAllowed()) return false;
  return true;
}

export function isAdaptiveReasoningShadowMode(mode?: AdaptiveReasoningMode): boolean {
  const resolved = mode ?? resolveAdaptiveReasoningMode();
  return resolved === "shadow-reasoning";
}

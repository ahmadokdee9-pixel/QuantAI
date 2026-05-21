/**
 * P5.4 — Commerce intelligence fusion flags (default OFF; no personalization).
 */

export const INTENT_FUSION_VERSION = "intent-fusion-v1" as const;

export const INTENT_FUSION_MAX_DELTA = 1.0;

export const INTENT_FUSION_MAX_DRIFT = 1.0;

export const INTENT_FUSION_MAX_TRUST_AMPLIFICATION = 0.85;

export const INTENT_FUSION_MAX_PREMIUM_AMPLIFICATION = 0.75;

export const INTENT_FUSION_MAX_SUPPRESSION_RECOVERY = 0.8;

export const INTENT_FUSION_MAX_DIVERSITY_INTERVENTION = 0.8;

export type IntentFusionMode =
  | "telemetry-only"
  | "passive-fusion"
  | "shadow-fusion"
  | "bounded-fusion"
  | "protected-fusion"
  | "full-safe-fusion";

export type IntentFusionRoutingLane =
  | "hold"
  | "stabilize"
  | "reinforce"
  | "recover"
  | "balance"
  | "suppress"
  | "compare"
  | "confidence-check";

const MUTATION_MODES: IntentFusionMode[] = [
  "bounded-fusion",
  "protected-fusion",
  "full-safe-fusion",
];

export function isIntentFusionEnabled(): boolean {
  return process.env.INTENT_FUSION_ENABLED === "true";
}

export function isIntentFusionHardRollback(): boolean {
  return (
    process.env.INTENT_FUSION_ENABLED === "false" ||
    process.env.INTENT_COORDINATION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_MEMORY_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_ORCHESTRATION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_RUNTIME_EMERGENCY_SHUTDOWN === "true"
  );
}

export function isIntentFusionEmergencyShutdown(): boolean {
  return process.env.INTENT_FUSION_EMERGENCY_SHUTDOWN === "true";
}

export function resolveIntentFusionMode(): IntentFusionMode {
  const raw = (process.env.INTENT_FUSION_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-fusion") return "passive-fusion";
  if (raw === "shadow-fusion") return "shadow-fusion";
  if (raw === "bounded-fusion") return "bounded-fusion";
  if (raw === "protected-fusion") return "protected-fusion";
  if (raw === "full-safe-fusion") return "full-safe-fusion";
  return "telemetry-only";
}

export function isIntentFusionProdOptIn(): boolean {
  return process.env.INTENT_FUSION_PROD_APPLY === "true";
}

export function isIntentFusionCanaryOptIn(): boolean {
  return process.env.INTENT_FUSION_CANARY_APPLY === "true";
}

export function isIntentFusionEnvironmentAllowed(): boolean {
  if (isIntentFusionHardRollback() || isIntentFusionEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isIntentFusionProdOptIn() || isIntentFusionCanaryOptIn();
}

export function isIntentFusionMutationEnabled(mode?: IntentFusionMode): boolean {
  const resolved = mode ?? resolveIntentFusionMode();
  if (!isIntentFusionEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isIntentFusionEnvironmentAllowed()) return false;
  return true;
}

export function isIntentFusionShadowMode(mode?: IntentFusionMode): boolean {
  const resolved = mode ?? resolveIntentFusionMode();
  return resolved === "shadow-fusion";
}

/**
 * P5.9 — Behavioral commerce intelligence flags (default OFF; advisory/telemetry-first).
 */

export const BEHAVIORAL_COMMERCE_VERSION = "behavioral-commerce-v1" as const;

export const BEHAVIORAL_MAX_DELTA = 1.0;

export const BEHAVIORAL_MAX_DRIFT = 1.0;

export const BEHAVIORAL_MAX_FRICTION_AMPLIFICATION = 0.8;

export const BEHAVIORAL_MAX_HESITATION_AMPLIFICATION = 0.8;

export const BEHAVIORAL_MAX_READINESS_AMPLIFICATION = 0.8;

export type BehavioralCommerceMode =
  | "telemetry-only"
  | "passive-behavioral"
  | "shadow-behavioral"
  | "bounded-behavioral"
  | "protected-behavioral"
  | "full-safe-behavioral";

export type BehavioralRoutingLane =
  | "hold"
  | "stabilize"
  | "advisory-only"
  | "friction-check"
  | "hesitation-check"
  | "comparison-fatigue"
  | "trust-momentum"
  | "conversion-ready"
  | "replay-protect"
  | "commerce-safe";

const MUTATION_MODES: BehavioralCommerceMode[] = [
  "bounded-behavioral",
  "protected-behavioral",
  "full-safe-behavioral",
];

export function isBehavioralCommerceEnabled(): boolean {
  return process.env.BEHAVIORAL_COMMERCE_ENABLED === "true";
}

export function isBehavioralCommerceHardRollback(): boolean {
  return (
    process.env.BEHAVIORAL_COMMERCE_ENABLED === "false" ||
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

export function isBehavioralCommerceEmergencyShutdown(): boolean {
  return process.env.BEHAVIORAL_COMMERCE_EMERGENCY_SHUTDOWN === "true";
}

export function resolveBehavioralCommerceMode(): BehavioralCommerceMode {
  const raw = (process.env.BEHAVIORAL_COMMERCE_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-behavioral") return "passive-behavioral";
  if (raw === "shadow-behavioral") return "shadow-behavioral";
  if (raw === "bounded-behavioral") return "bounded-behavioral";
  if (raw === "protected-behavioral") return "protected-behavioral";
  if (raw === "full-safe-behavioral") return "full-safe-behavioral";
  return "telemetry-only";
}

export function isBehavioralCommerceProdOptIn(): boolean {
  return process.env.BEHAVIORAL_COMMERCE_PROD_APPLY === "true";
}

export function isBehavioralCommerceCanaryOptIn(): boolean {
  return process.env.BEHAVIORAL_COMMERCE_CANARY_APPLY === "true";
}

export function isBehavioralCommerceEnvironmentAllowed(): boolean {
  if (isBehavioralCommerceHardRollback() || isBehavioralCommerceEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isBehavioralCommerceProdOptIn() || isBehavioralCommerceCanaryOptIn();
}

export function isBehavioralCommerceMutationEnabled(mode?: BehavioralCommerceMode): boolean {
  const resolved = mode ?? resolveBehavioralCommerceMode();
  if (!isBehavioralCommerceEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isBehavioralCommerceEnvironmentAllowed()) return false;
  return true;
}

export function isBehavioralCommerceShadowMode(mode?: BehavioralCommerceMode): boolean {
  const resolved = mode ?? resolveBehavioralCommerceMode();
  return resolved === "shadow-behavioral";
}

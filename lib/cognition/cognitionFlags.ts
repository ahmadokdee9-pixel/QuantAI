/**
 * P6.0 — Unified commerce cognition flags (default OFF; no personalization).
 */

export const COGNITION_ENGINE_VERSION = "cognition-engine-v1" as const;

export const COGNITION_MAX_DELTA = 1.0;

export const COGNITION_MAX_DRIFT = 1.0;

export const COGNITION_MAX_REASONING_INFLUENCE = 0.85;

export const COGNITION_MAX_STRATEGY_INFLUENCE = 0.8;

export const COGNITION_MAX_MARKET_INFLUENCE = 0.8;

export const COGNITION_MAX_BEHAVIORAL_INFLUENCE = 0.8;

export type CognitionEngineMode =
  | "telemetry-only"
  | "passive-cognition"
  | "shadow-cognition"
  | "bounded-cognition"
  | "protected-cognition"
  | "full-safe-cognition";

export type CognitionRoutingLane =
  | "hold"
  | "stabilize"
  | "reinforce"
  | "compare"
  | "strategic-balance"
  | "conversion-check"
  | "momentum-check"
  | "behavior-check"
  | "contradiction-check"
  | "cognition-safe"
  | "replay-protect";

const MUTATION_MODES: CognitionEngineMode[] = [
  "bounded-cognition",
  "protected-cognition",
  "full-safe-cognition",
];

export function isCognitionEngineEnabled(): boolean {
  return process.env.COGNITION_ENGINE_ENABLED === "true";
}

export function isCognitionEngineHardRollback(): boolean {
  return (
    process.env.COGNITION_ENGINE_ENABLED === "false" ||
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

export function isCognitionEngineEmergencyShutdown(): boolean {
  return process.env.COGNITION_ENGINE_EMERGENCY_SHUTDOWN === "true";
}

export function resolveCognitionEngineMode(): CognitionEngineMode {
  const raw = (process.env.COGNITION_ENGINE_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-cognition") return "passive-cognition";
  if (raw === "shadow-cognition") return "shadow-cognition";
  if (raw === "bounded-cognition") return "bounded-cognition";
  if (raw === "protected-cognition") return "protected-cognition";
  if (raw === "full-safe-cognition") return "full-safe-cognition";
  return "telemetry-only";
}

export function isCognitionEngineProdOptIn(): boolean {
  return process.env.COGNITION_ENGINE_PROD_APPLY === "true";
}

export function isCognitionEngineCanaryOptIn(): boolean {
  return process.env.COGNITION_ENGINE_CANARY_APPLY === "true";
}

export function isCognitionEngineEnvironmentAllowed(): boolean {
  if (isCognitionEngineHardRollback() || isCognitionEngineEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isCognitionEngineProdOptIn() || isCognitionEngineCanaryOptIn();
}

export function isCognitionEngineMutationEnabled(mode?: CognitionEngineMode): boolean {
  const resolved = mode ?? resolveCognitionEngineMode();
  if (!isCognitionEngineEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isCognitionEngineEnvironmentAllowed()) return false;
  return true;
}

export function isCognitionEngineShadowMode(mode?: CognitionEngineMode): boolean {
  const resolved = mode ?? resolveCognitionEngineMode();
  return resolved === "shadow-cognition";
}

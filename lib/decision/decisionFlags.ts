/**
 * P5.6 — Commerce decision intelligence flags (default OFF; no personalization).
 */

export const DECISION_INTELLIGENCE_VERSION = "decision-intelligence-v1" as const;

export const DECISION_MAX_DELTA = 1.0;

export const DECISION_MAX_DRIFT = 1.0;

export const DECISION_MAX_TRUST_AMPLIFICATION = 0.8;

export const DECISION_MAX_PREMIUM_AMPLIFICATION = 0.75;

export const DECISION_MAX_RECOMMENDATION_AMPLIFICATION = 0.85;

export const DECISION_MAX_COMPARISON_INFLUENCE = 0.8;

export type DecisionIntelligenceMode =
  | "telemetry-only"
  | "passive-decision"
  | "shadow-decision"
  | "bounded-decision"
  | "protected-decision"
  | "full-safe-decision";

export type DecisionRoutingLane =
  | "hold"
  | "stabilize"
  | "reinforce"
  | "compare"
  | "confidence-check"
  | "decision-balance"
  | "risk-check"
  | "replay-protect"
  | "commerce-safe";

const MUTATION_MODES: DecisionIntelligenceMode[] = [
  "bounded-decision",
  "protected-decision",
  "full-safe-decision",
];

export function isDecisionIntelligenceEnabled(): boolean {
  return process.env.DECISION_INTELLIGENCE_ENABLED === "true";
}

export function isDecisionIntelligenceHardRollback(): boolean {
  return (
    process.env.DECISION_INTELLIGENCE_ENABLED === "false" ||
    process.env.ADAPTIVE_REASONING_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_FUSION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_COORDINATION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_MEMORY_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_ORCHESTRATION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_RUNTIME_EMERGENCY_SHUTDOWN === "true"
  );
}

export function isDecisionIntelligenceEmergencyShutdown(): boolean {
  return process.env.DECISION_INTELLIGENCE_EMERGENCY_SHUTDOWN === "true";
}

export function resolveDecisionIntelligenceMode(): DecisionIntelligenceMode {
  const raw = (process.env.DECISION_INTELLIGENCE_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-decision") return "passive-decision";
  if (raw === "shadow-decision") return "shadow-decision";
  if (raw === "bounded-decision") return "bounded-decision";
  if (raw === "protected-decision") return "protected-decision";
  if (raw === "full-safe-decision") return "full-safe-decision";
  return "telemetry-only";
}

export function isDecisionIntelligenceProdOptIn(): boolean {
  return process.env.DECISION_INTELLIGENCE_PROD_APPLY === "true";
}

export function isDecisionIntelligenceCanaryOptIn(): boolean {
  return process.env.DECISION_INTELLIGENCE_CANARY_APPLY === "true";
}

export function isDecisionIntelligenceEnvironmentAllowed(): boolean {
  if (isDecisionIntelligenceHardRollback() || isDecisionIntelligenceEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isDecisionIntelligenceProdOptIn() || isDecisionIntelligenceCanaryOptIn();
}

export function isDecisionIntelligenceMutationEnabled(mode?: DecisionIntelligenceMode): boolean {
  const resolved = mode ?? resolveDecisionIntelligenceMode();
  if (!isDecisionIntelligenceEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isDecisionIntelligenceEnvironmentAllowed()) return false;
  return true;
}

export function isDecisionIntelligenceShadowMode(mode?: DecisionIntelligenceMode): boolean {
  const resolved = mode ?? resolveDecisionIntelligenceMode();
  return resolved === "shadow-decision";
}

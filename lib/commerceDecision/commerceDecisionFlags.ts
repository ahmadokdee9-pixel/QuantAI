/**
 * P6.6 — Commerce decision intelligence flags (default OFF; aggregate telemetry only).
 */

export const COMMERCE_DECISION_INTELLIGENCE_VERSION = "commerce-decision-intelligence-v1" as const;

export const COMMERCE_DECISION_MAX_DELTA = 1.0;

export const COMMERCE_DECISION_MAX_DRIFT = 1.0;

export const COMMERCE_DECISION_MAX_CONTINUITY_AMPLIFICATION = 0.75;

export const COMMERCE_DECISION_MAX_INTEGRITY_AMPLIFICATION = 0.75;

export type CommerceDecisionIntelligenceMode =
  | "telemetry-only"
  | "passive-decision"
  | "shadow-decision"
  | "bounded-decision"
  | "protected-decision"
  | "full-safe-decision";

export type CommerceDecisionRoutingLane =
  | "hold"
  | "stabilize"
  | "reinforce"
  | "recommendation-check"
  | "outcome-check"
  | "promotion-check"
  | "purchase-check"
  | "trust-value-check"
  | "conversion-check"
  | "consistency-check"
  | "tradeoff-check"
  | "decision-safe"
  | "replay-protect";

const MUTATION_MODES: CommerceDecisionIntelligenceMode[] = ["bounded-decision", "protected-decision", "full-safe-decision"];

export function isCommerceDecisionIntelligenceEnabled(): boolean {
  return process.env.COMMERCE_DECISION_INTELLIGENCE_ENABLED === "true";
}

export function isCommerceDecisionIntelligenceHardRollback(): boolean {
  return (
    process.env.COMMERCE_DECISION_INTELLIGENCE_ENABLED === "false" ||
    process.env.MARKET_REALITY_INTELLIGENCE_EMERGENCY_SHUTDOWN === "true" ||
    process.env.MEMORYLESS_COMMERCE_LEARNING_EMERGENCY_SHUTDOWN === "true" ||
    process.env.ADAPTIVE_STRATEGIC_RANKING_EMERGENCY_SHUTDOWN === "true" ||
    process.env.MULTI_OBJECTIVE_COMMERCE_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_COGNITION_EMERGENCY_SHUTDOWN === "true" ||
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

export function isCommerceDecisionIntelligenceEmergencyShutdown(): boolean {
  return process.env.COMMERCE_DECISION_INTELLIGENCE_EMERGENCY_SHUTDOWN === "true";
}

export function resolveCommerceDecisionIntelligenceMode(): CommerceDecisionIntelligenceMode {
  const raw = (process.env.COMMERCE_DECISION_INTELLIGENCE_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-decision") return "passive-decision";
  if (raw === "shadow-decision") return "shadow-decision";
  if (raw === "bounded-decision") return "bounded-decision";
  if (raw === "protected-decision") return "protected-decision";
  if (raw === "full-safe-decision") return "full-safe-decision";
  return "telemetry-only";
}

export function isCommerceDecisionIntelligenceProdOptIn(): boolean {
  return process.env.COMMERCE_DECISION_INTELLIGENCE_PROD_APPLY === "true";
}

export function isCommerceDecisionIntelligenceCanaryOptIn(): boolean {
  return process.env.COMMERCE_DECISION_INTELLIGENCE_CANARY_APPLY === "true";
}

export function isCommerceDecisionIntelligenceEnvironmentAllowed(): boolean {
  if (isCommerceDecisionIntelligenceHardRollback() || isCommerceDecisionIntelligenceEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isCommerceDecisionIntelligenceProdOptIn() || isCommerceDecisionIntelligenceCanaryOptIn();
}

export function isCommerceDecisionIntelligenceMutationEnabled(mode?: CommerceDecisionIntelligenceMode): boolean {
  const resolved = mode ?? resolveCommerceDecisionIntelligenceMode();
  if (!isCommerceDecisionIntelligenceEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isCommerceDecisionIntelligenceEnvironmentAllowed()) return false;
  return true;
}

export function isCommerceDecisionIntelligenceShadowMode(mode?: CommerceDecisionIntelligenceMode): boolean {
  const resolved = mode ?? resolveCommerceDecisionIntelligenceMode();
  return resolved === "shadow-decision";
}

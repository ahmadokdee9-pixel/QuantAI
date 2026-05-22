/**
 * P6.3 — Adaptive strategic ranking flags (default OFF; no personalization memory).
 */

export const ADAPTIVE_STRATEGIC_RANKING_VERSION = "adaptive-strategic-ranking-v1" as const;

export const STRATEGIC_RANKING_MAX_DELTA = 1.0;

export const STRATEGIC_RANKING_MAX_DRIFT = 1.0;

export const STRATEGIC_RANKING_MAX_TRUST_AMPLIFICATION = 0.75;

export const STRATEGIC_RANKING_MAX_CONVERSION_AMPLIFICATION = 0.75;

export const STRATEGIC_RANKING_MAX_AESTHETIC_AMPLIFICATION = 0.75;

export type AdaptiveStrategicRankingMode =
  | "telemetry-only"
  | "passive-strategic"
  | "shadow-strategic"
  | "bounded-strategic"
  | "protected-strategic"
  | "full-safe-strategic";

export type StrategicRankingRoutingLane =
  | "hold"
  | "stabilize"
  | "reinforce"
  | "compare"
  | "strategic-balance"
  | "conversion-check"
  | "trust-check"
  | "inflation-check"
  | "contradiction-check"
  | "ranking-safe"
  | "replay-protect";

const MUTATION_MODES: AdaptiveStrategicRankingMode[] = ["bounded-strategic", "protected-strategic", "full-safe-strategic"];

export function isAdaptiveStrategicRankingEnabled(): boolean {
  return process.env.ADAPTIVE_STRATEGIC_RANKING_ENABLED === "true";
}

export function isAdaptiveStrategicRankingHardRollback(): boolean {
  return (
    process.env.ADAPTIVE_STRATEGIC_RANKING_ENABLED === "false" ||
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

export function isAdaptiveStrategicRankingEmergencyShutdown(): boolean {
  return process.env.ADAPTIVE_STRATEGIC_RANKING_EMERGENCY_SHUTDOWN === "true";
}

export function resolveAdaptiveStrategicRankingMode(): AdaptiveStrategicRankingMode {
  const raw = (process.env.ADAPTIVE_STRATEGIC_RANKING_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-strategic") return "passive-strategic";
  if (raw === "shadow-strategic") return "shadow-strategic";
  if (raw === "bounded-strategic") return "bounded-strategic";
  if (raw === "protected-strategic") return "protected-strategic";
  if (raw === "full-safe-strategic") return "full-safe-strategic";
  return "telemetry-only";
}

export function isAdaptiveStrategicRankingProdOptIn(): boolean {
  return process.env.ADAPTIVE_STRATEGIC_RANKING_PROD_APPLY === "true";
}

export function isAdaptiveStrategicRankingCanaryOptIn(): boolean {
  return process.env.ADAPTIVE_STRATEGIC_RANKING_CANARY_APPLY === "true";
}

export function isAdaptiveStrategicRankingEnvironmentAllowed(): boolean {
  if (isAdaptiveStrategicRankingHardRollback() || isAdaptiveStrategicRankingEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isAdaptiveStrategicRankingProdOptIn() || isAdaptiveStrategicRankingCanaryOptIn();
}

export function isAdaptiveStrategicRankingMutationEnabled(mode?: AdaptiveStrategicRankingMode): boolean {
  const resolved = mode ?? resolveAdaptiveStrategicRankingMode();
  if (!isAdaptiveStrategicRankingEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isAdaptiveStrategicRankingEnvironmentAllowed()) return false;
  return true;
}

export function isAdaptiveStrategicRankingShadowMode(mode?: AdaptiveStrategicRankingMode): boolean {
  const resolved = mode ?? resolveAdaptiveStrategicRankingMode();
  return resolved === "shadow-strategic";
}

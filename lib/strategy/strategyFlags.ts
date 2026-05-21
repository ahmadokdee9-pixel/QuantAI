/**
 * P5.7 — Strategic commerce intelligence flags (default OFF; no personalization).
 */

export const STRATEGY_INTELLIGENCE_VERSION = "strategy-intelligence-v1" as const;

export const STRATEGY_MAX_DELTA = 1.0;

export const STRATEGY_MAX_DRIFT = 1.0;

export const STRATEGY_MAX_CONVERSION_AMPLIFICATION = 0.85;

export const STRATEGY_MAX_DOMINANCE_AMPLIFICATION = 0.8;

export const STRATEGY_MAX_COMPARISON_AMPLIFICATION = 0.8;

export const STRATEGY_MAX_MOMENTUM_INFLUENCE = 0.75;

export type StrategyIntelligenceMode =
  | "telemetry-only"
  | "passive-strategy"
  | "shadow-strategy"
  | "bounded-strategy"
  | "protected-strategy"
  | "full-safe-strategy";

export type StrategyRoutingLane =
  | "hold"
  | "stabilize"
  | "reinforce"
  | "compare"
  | "strategic-balance"
  | "conversion-check"
  | "momentum-check"
  | "replay-protect"
  | "commerce-safe"
  | "category-priority";

const MUTATION_MODES: StrategyIntelligenceMode[] = [
  "bounded-strategy",
  "protected-strategy",
  "full-safe-strategy",
];

export function isStrategyIntelligenceEnabled(): boolean {
  return process.env.STRATEGY_INTELLIGENCE_ENABLED === "true";
}

export function isStrategyIntelligenceHardRollback(): boolean {
  return (
    process.env.STRATEGY_INTELLIGENCE_ENABLED === "false" ||
    process.env.DECISION_INTELLIGENCE_EMERGENCY_SHUTDOWN === "true" ||
    process.env.ADAPTIVE_REASONING_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_FUSION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_COORDINATION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_MEMORY_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_ORCHESTRATION_EMERGENCY_SHUTDOWN === "true" ||
    process.env.INTENT_RUNTIME_EMERGENCY_SHUTDOWN === "true"
  );
}

export function isStrategyIntelligenceEmergencyShutdown(): boolean {
  return process.env.STRATEGY_INTELLIGENCE_EMERGENCY_SHUTDOWN === "true";
}

export function resolveStrategyIntelligenceMode(): StrategyIntelligenceMode {
  const raw = (process.env.STRATEGY_INTELLIGENCE_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-strategy") return "passive-strategy";
  if (raw === "shadow-strategy") return "shadow-strategy";
  if (raw === "bounded-strategy") return "bounded-strategy";
  if (raw === "protected-strategy") return "protected-strategy";
  if (raw === "full-safe-strategy") return "full-safe-strategy";
  return "telemetry-only";
}

export function isStrategyIntelligenceProdOptIn(): boolean {
  return process.env.STRATEGY_INTELLIGENCE_PROD_APPLY === "true";
}

export function isStrategyIntelligenceCanaryOptIn(): boolean {
  return process.env.STRATEGY_INTELLIGENCE_CANARY_APPLY === "true";
}

export function isStrategyIntelligenceEnvironmentAllowed(): boolean {
  if (isStrategyIntelligenceHardRollback() || isStrategyIntelligenceEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isStrategyIntelligenceProdOptIn() || isStrategyIntelligenceCanaryOptIn();
}

export function isStrategyIntelligenceMutationEnabled(mode?: StrategyIntelligenceMode): boolean {
  const resolved = mode ?? resolveStrategyIntelligenceMode();
  if (!isStrategyIntelligenceEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isStrategyIntelligenceEnvironmentAllowed()) return false;
  return true;
}

export function isStrategyIntelligenceShadowMode(mode?: StrategyIntelligenceMode): boolean {
  const resolved = mode ?? resolveStrategyIntelligenceMode();
  return resolved === "shadow-strategy";
}

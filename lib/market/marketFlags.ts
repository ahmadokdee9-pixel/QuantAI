/**
 * P5.8 — Adaptive market intelligence flags (default OFF; no personalization).
 */

export const MARKET_INTELLIGENCE_VERSION = "market-intelligence-v1" as const;

export const MARKET_MAX_DELTA = 1.0;

export const MARKET_MAX_DRIFT = 1.0;

export const MARKET_MAX_VOLATILITY_AMPLIFICATION = 0.8;

export const MARKET_MAX_MOMENTUM_AMPLIFICATION = 0.8;

export const MARKET_MAX_TRUST_AMPLIFICATION = 0.8;

export type MarketIntelligenceMode =
  | "telemetry-only"
  | "passive-market"
  | "shadow-market"
  | "bounded-market"
  | "protected-market"
  | "full-safe-market";

export type MarketRoutingLane =
  | "hold"
  | "stabilize"
  | "reinforce"
  | "compare"
  | "strategic-balance"
  | "conversion-check"
  | "momentum-check"
  | "replay-protect"
  | "commerce-safe"
  | "category-priority"
  | "volatility-check"
  | "trust-check";

const MUTATION_MODES: MarketIntelligenceMode[] = ["bounded-market", "protected-market", "full-safe-market"];

export function isMarketIntelligenceEnabled(): boolean {
  return process.env.MARKET_INTELLIGENCE_ENABLED === "true";
}

export function isMarketIntelligenceHardRollback(): boolean {
  return (
    process.env.MARKET_INTELLIGENCE_ENABLED === "false" ||
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

export function isMarketIntelligenceEmergencyShutdown(): boolean {
  return process.env.MARKET_INTELLIGENCE_EMERGENCY_SHUTDOWN === "true";
}

export function resolveMarketIntelligenceMode(): MarketIntelligenceMode {
  const raw = (process.env.MARKET_INTELLIGENCE_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-market") return "passive-market";
  if (raw === "shadow-market") return "shadow-market";
  if (raw === "bounded-market") return "bounded-market";
  if (raw === "protected-market") return "protected-market";
  if (raw === "full-safe-market") return "full-safe-market";
  return "telemetry-only";
}

export function isMarketIntelligenceProdOptIn(): boolean {
  return process.env.MARKET_INTELLIGENCE_PROD_APPLY === "true";
}

export function isMarketIntelligenceCanaryOptIn(): boolean {
  return process.env.MARKET_INTELLIGENCE_CANARY_APPLY === "true";
}

export function isMarketIntelligenceEnvironmentAllowed(): boolean {
  if (isMarketIntelligenceHardRollback() || isMarketIntelligenceEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isMarketIntelligenceProdOptIn() || isMarketIntelligenceCanaryOptIn();
}

export function isMarketIntelligenceMutationEnabled(mode?: MarketIntelligenceMode): boolean {
  const resolved = mode ?? resolveMarketIntelligenceMode();
  if (!isMarketIntelligenceEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isMarketIntelligenceEnvironmentAllowed()) return false;
  return true;
}

export function isMarketIntelligenceShadowMode(mode?: MarketIntelligenceMode): boolean {
  const resolved = mode ?? resolveMarketIntelligenceMode();
  return resolved === "shadow-market";
}

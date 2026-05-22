/**
 * P6.5 — Market reality intelligence flags (default OFF; aggregate telemetry only).
 */

export const MARKET_REALITY_INTELLIGENCE_VERSION = "market-reality-intelligence-v1" as const;

export const MARKET_REALITY_MAX_DELTA = 1.0;

export const MARKET_REALITY_MAX_DRIFT = 1.0;

export const MARKET_REALITY_MAX_PRICING_AMPLIFICATION = 0.75;

export const MARKET_REALITY_MAX_MERCHANT_AMPLIFICATION = 0.75;

export type MarketRealityIntelligenceMode =
  | "telemetry-only"
  | "passive-reality"
  | "shadow-reality"
  | "bounded-reality"
  | "protected-reality"
  | "full-safe-reality";

export type MarketRealityRoutingLane =
  | "hold"
  | "stabilize"
  | "reinforce"
  | "discount-check"
  | "retailer-check"
  | "volatility-check"
  | "listing-check"
  | "marketplace-check"
  | "trust-check"
  | "inventory-check"
  | "offer-check"
  | "signal-check"
  | "pricing-safe"
  | "replay-protect";

const MUTATION_MODES: MarketRealityIntelligenceMode[] = ["bounded-reality", "protected-reality", "full-safe-reality"];

export function isMarketRealityIntelligenceEnabled(): boolean {
  return process.env.MARKET_REALITY_INTELLIGENCE_ENABLED === "true";
}

export function isMarketRealityIntelligenceHardRollback(): boolean {
  return (
    process.env.MARKET_REALITY_INTELLIGENCE_ENABLED === "false" ||
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

export function isMarketRealityIntelligenceEmergencyShutdown(): boolean {
  return process.env.MARKET_REALITY_INTELLIGENCE_EMERGENCY_SHUTDOWN === "true";
}

export function resolveMarketRealityIntelligenceMode(): MarketRealityIntelligenceMode {
  const raw = (process.env.MARKET_REALITY_INTELLIGENCE_MODE ?? "telemetry-only").trim().toLowerCase();
  if (raw === "passive-reality") return "passive-reality";
  if (raw === "shadow-reality") return "shadow-reality";
  if (raw === "bounded-reality") return "bounded-reality";
  if (raw === "protected-reality") return "protected-reality";
  if (raw === "full-safe-reality") return "full-safe-reality";
  return "telemetry-only";
}

export function isMarketRealityIntelligenceProdOptIn(): boolean {
  return process.env.MARKET_REALITY_INTELLIGENCE_PROD_APPLY === "true";
}

export function isMarketRealityIntelligenceCanaryOptIn(): boolean {
  return process.env.MARKET_REALITY_INTELLIGENCE_CANARY_APPLY === "true";
}

export function isMarketRealityIntelligenceEnvironmentAllowed(): boolean {
  if (isMarketRealityIntelligenceHardRollback() || isMarketRealityIntelligenceEmergencyShutdown()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return isMarketRealityIntelligenceProdOptIn() || isMarketRealityIntelligenceCanaryOptIn();
}

export function isMarketRealityIntelligenceMutationEnabled(mode?: MarketRealityIntelligenceMode): boolean {
  const resolved = mode ?? resolveMarketRealityIntelligenceMode();
  if (!isMarketRealityIntelligenceEnabled()) return false;
  if (!MUTATION_MODES.includes(resolved)) return false;
  if (!isMarketRealityIntelligenceEnvironmentAllowed()) return false;
  return true;
}

export function isMarketRealityIntelligenceShadowMode(mode?: MarketRealityIntelligenceMode): boolean {
  const resolved = mode ?? resolveMarketRealityIntelligenceMode();
  return resolved === "shadow-reality";
}

/**
 * P5.8 — Market profile registry (bounded cognition; no user profiling).
 */

import type { MarketIntelligenceMode } from "@/lib/market/marketFlags";
import {
  MARKET_MAX_DELTA,
  MARKET_MAX_MOMENTUM_AMPLIFICATION,
  MARKET_MAX_TRUST_AMPLIFICATION,
  MARKET_MAX_VOLATILITY_AMPLIFICATION,
} from "@/lib/market/marketFlags";

export type MarketProfile = {
  id: MarketIntelligenceMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresStrategyStable: boolean;
  requiresFusionStable: boolean;
  maxDelta: number;
  maxVolatilityAmplification: number;
  maxMomentumAmplification: number;
  maxTrustAmplification: number;
};

export const MARKET_PROFILES: MarketProfile[] = [
  {
    id: "telemetry-only",
    description: "Market telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresStrategyStable: false,
    requiresFusionStable: false,
    maxDelta: MARKET_MAX_DELTA,
    maxVolatilityAmplification: MARKET_MAX_VOLATILITY_AMPLIFICATION,
    maxMomentumAmplification: MARKET_MAX_MOMENTUM_AMPLIFICATION,
    maxTrustAmplification: MARKET_MAX_TRUST_AMPLIFICATION,
  },
  {
    id: "passive-market",
    description: "Passive market signals only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresStrategyStable: false,
    requiresFusionStable: false,
    maxDelta: MARKET_MAX_DELTA,
    maxVolatilityAmplification: MARKET_MAX_VOLATILITY_AMPLIFICATION,
    maxMomentumAmplification: MARKET_MAX_MOMENTUM_AMPLIFICATION,
    maxTrustAmplification: MARKET_MAX_TRUST_AMPLIFICATION,
  },
  {
    id: "shadow-market",
    description: "Shadow market deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresStrategyStable: false,
    requiresFusionStable: false,
    maxDelta: MARKET_MAX_DELTA,
    maxVolatilityAmplification: MARKET_MAX_VOLATILITY_AMPLIFICATION,
    maxMomentumAmplification: MARKET_MAX_MOMENTUM_AMPLIFICATION,
    maxTrustAmplification: MARKET_MAX_TRUST_AMPLIFICATION,
  },
  {
    id: "bounded-market",
    description: "Bounded adaptive market ranking synthesis.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresStrategyStable: false,
    requiresFusionStable: false,
    maxDelta: MARKET_MAX_DELTA,
    maxVolatilityAmplification: MARKET_MAX_VOLATILITY_AMPLIFICATION,
    maxMomentumAmplification: MARKET_MAX_MOMENTUM_AMPLIFICATION,
    maxTrustAmplification: MARKET_MAX_TRUST_AMPLIFICATION,
  },
  {
    id: "protected-market",
    description: "Market with governance + strategy stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresStrategyStable: true,
    requiresFusionStable: false,
    maxDelta: MARKET_MAX_DELTA,
    maxVolatilityAmplification: MARKET_MAX_VOLATILITY_AMPLIFICATION,
    maxMomentumAmplification: MARKET_MAX_MOMENTUM_AMPLIFICATION,
    maxTrustAmplification: MARKET_MAX_TRUST_AMPLIFICATION,
  },
  {
    id: "full-safe-market",
    description: "Full market with fusion + replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresStrategyStable: true,
    requiresFusionStable: true,
    maxDelta: MARKET_MAX_DELTA,
    maxVolatilityAmplification: MARKET_MAX_VOLATILITY_AMPLIFICATION,
    maxMomentumAmplification: MARKET_MAX_MOMENTUM_AMPLIFICATION,
    maxTrustAmplification: MARKET_MAX_TRUST_AMPLIFICATION,
  },
];

export function resolveMarketProfile(mode: MarketIntelligenceMode): MarketProfile {
  return MARKET_PROFILES.find((p) => p.id === mode) ?? MARKET_PROFILES[0];
}

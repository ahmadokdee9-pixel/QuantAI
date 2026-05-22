/**
 * P6.5 — Market reality intelligence profile registry (aggregate telemetry only; no user profiles).
 */

import type { MarketRealityIntelligenceMode } from "@/lib/marketReality/marketRealityFlags";
import {
  MARKET_REALITY_MAX_DELTA,
  MARKET_REALITY_MAX_MERCHANT_AMPLIFICATION,
  MARKET_REALITY_MAX_PRICING_AMPLIFICATION,
} from "@/lib/marketReality/marketRealityFlags";

export type MarketRealityIntelligenceProfile = {
  id: MarketRealityIntelligenceMode;
  description: string;
  allowsMutation: boolean;
  requiresGovernancePass: boolean;
  requiresLearningStable: boolean;
  maxDelta: number;
  maxPricingAmplification: number;
  maxMerchantAmplification: number;
};

export const MARKET_REALITY_INTELLIGENCE_PROFILES: MarketRealityIntelligenceProfile[] = [
  {
    id: "telemetry-only",
    description: "Market reality telemetry without ranking mutation.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresLearningStable: false,
    maxDelta: MARKET_REALITY_MAX_DELTA,
    maxPricingAmplification: MARKET_REALITY_MAX_PRICING_AMPLIFICATION,
    maxMerchantAmplification: MARKET_REALITY_MAX_MERCHANT_AMPLIFICATION,
  },
  {
    id: "passive-reality",
    description: "Passive market reality signals from aggregate telemetry only.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresLearningStable: false,
    maxDelta: MARKET_REALITY_MAX_DELTA,
    maxPricingAmplification: MARKET_REALITY_MAX_PRICING_AMPLIFICATION,
    maxMerchantAmplification: MARKET_REALITY_MAX_MERCHANT_AMPLIFICATION,
  },
  {
    id: "shadow-reality",
    description: "Shadow market reality deltas recorded; order unchanged.",
    allowsMutation: false,
    requiresGovernancePass: false,
    requiresLearningStable: false,
    maxDelta: MARKET_REALITY_MAX_DELTA,
    maxPricingAmplification: MARKET_REALITY_MAX_PRICING_AMPLIFICATION,
    maxMerchantAmplification: MARKET_REALITY_MAX_MERCHANT_AMPLIFICATION,
  },
  {
    id: "bounded-reality",
    description: "Bounded market reality ranking stabilization.",
    allowsMutation: true,
    requiresGovernancePass: false,
    requiresLearningStable: false,
    maxDelta: MARKET_REALITY_MAX_DELTA,
    maxPricingAmplification: MARKET_REALITY_MAX_PRICING_AMPLIFICATION,
    maxMerchantAmplification: MARKET_REALITY_MAX_MERCHANT_AMPLIFICATION,
  },
  {
    id: "protected-reality",
    description: "Market reality with governance + learning stability gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresLearningStable: true,
    maxDelta: MARKET_REALITY_MAX_DELTA,
    maxPricingAmplification: MARKET_REALITY_MAX_PRICING_AMPLIFICATION,
    maxMerchantAmplification: MARKET_REALITY_MAX_MERCHANT_AMPLIFICATION,
  },
  {
    id: "full-safe-reality",
    description: "Full market reality with replay integrity gates.",
    allowsMutation: true,
    requiresGovernancePass: true,
    requiresLearningStable: true,
    maxDelta: MARKET_REALITY_MAX_DELTA,
    maxPricingAmplification: MARKET_REALITY_MAX_PRICING_AMPLIFICATION,
    maxMerchantAmplification: MARKET_REALITY_MAX_MERCHANT_AMPLIFICATION,
  },
];

export function resolveMarketRealityIntelligenceProfile(mode: MarketRealityIntelligenceMode): MarketRealityIntelligenceProfile {
  return MARKET_REALITY_INTELLIGENCE_PROFILES.find((p) => p.id === mode) ?? MARKET_REALITY_INTELLIGENCE_PROFILES[0];
}

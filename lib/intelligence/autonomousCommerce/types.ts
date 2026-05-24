/**
 * Phase 8 — Autonomous commerce OS types (shadow-safe, deterministic).
 */

import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CanonicalProductNode } from "@/lib/intelligence/identity/types";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";

export const AUTONOMOUS_COMMERCE_OS_VERSION = "phase8.0";

export type MarketConditionProfile = {
  seasonalDemand01: number;
  pricingPressure01: number;
  inventoryScarcity01: number;
  merchantVolatility01: number;
  discountAnomaly01: number;
  categoryMomentum01: number;
  launchCycle01: number;
  marketSaturation01: number;
};

export type EconomicContextProfile = {
  inflationSensitive01: number;
  premiumCompression01: number;
  valueMigration01: number;
  regionalPattern01: number;
  pricingInstability01: number;
  seasonalAffordability01: number;
};

export type StrategicRecommendationLayer = {
  layerId: string;
  horizon: "immediate" | "seasonal" | "replacement_cycle";
  confidence01: number;
  rankingMutation: false;
};

export type CommerceOsExplainability = {
  whyNow: string[];
  whyMarketShift: string[];
  whyPricePressure: string[];
  whyCategoryMomentum: string[];
  whyEconomicFit: string[];
  whyReplacementCycle: string[];
  whyStrategicRecommendation: string[];
};

export type AutonomousCommerceOsMeta = {
  version: string;
  enabled: boolean;
  shadowOnly: true;
  query: string;
  inputCount: number;
  graphNodeCount: number;
  strategyLayerCount: number;
  avgStrategicConfidence: number;
  safetyBlockedCount: number;
  cognitionBytes: number;
  latencyMs: number;
  market: { pressureScore: number; momentumScore: number };
  economic: { fitScore: number; instabilityScore: number };
};

export type AutonomousCommerceOsResult = {
  products: QuantProduct[];
  meta: AutonomousCommerceOsMeta;
  market: MarketConditionProfile;
  economic: EconomicContextProfile;
  explain: CommerceOsExplainability;
  strategicLayers: StrategicRecommendationLayer[];
  replayFingerprint: string;
};

export type AutonomousCommerceOsInput = {
  products: QuantProduct[];
  query: string;
  sessionMemory?: CommerceSessionMemoryV1;
  canonicalProducts?: CanonicalProductNode[];
  trustResult?: TrustEngineResult | null;
  memoryResult?: CommerceMemoryResult | null;
  recommendationResult?: RecommendationCognitionResult | null;
};

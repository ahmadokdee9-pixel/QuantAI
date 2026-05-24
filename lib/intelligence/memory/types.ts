/**
 * Phase 6 — Commerce memory + taste intelligence types (shadow-safe, deterministic).
 */

import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { CanonicalProductNode } from "@/lib/intelligence/identity/types";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";

export const MEMORY_ENGINE_VERSION = "phase6.0";

export type AestheticAxisScores = {
  minimalist01: number;
  luxury01: number;
  gamer01: number;
  professional01: number;
};

export type TasteSensitivityProfile = {
  qualitySensitivity01: number;
  priceSensitivity01: number;
  premiumPreference01: number;
  trustSensitivity01: number;
  aestheticConsistency01: number;
};

export type CanonicalUserTaste = {
  aestheticProfile: AestheticAxisScores;
  trustProfile: { trustSensitivity01: number; merchantSensitivity01: number };
  pricingBehavior: { priceSensitivity01: number; dealSeeking01: number };
  categoryPreferences: Record<string, number>;
  qualityExpectations: { qualitySensitivity01: number };
  premiumIntent: { premiumPreference01: number };
  merchantSensitivity: { preferredStores: string[]; avoidedRisk01: number };
};

export type MemoryExplainability = {
  whyRecommended: string[];
  whyPreferenceDetected: string[];
  whyBrandAffinity: string[];
  whyPriceSensitivity: string[];
  whyTrustPreference: string[];
};

export type DeterministicPreferenceSignals = {
  preferenceScore: number;
  confidence01: number;
  stability01: number;
  decayedWeight01: number;
  rankingMutation: false;
};

export type RecommendationPrepNode = {
  commerceId: string;
  candidateLinks: string[];
  relatedCommerceIds: string[];
  similarityPrepScore: number;
  crossCategoryHint: string | null;
  rankingMutation: false;
};

export type CommerceMemoryMeta = {
  version: string;
  enabled: boolean;
  shadowOnly: true;
  query: string;
  inputCount: number;
  memoryNodeCount: number;
  tasteProfileConfidence: number;
  preferenceCoverage: number;
  avgPreferenceConfidence: number;
  memoryGrowthBytes: number;
  latencyMs: number;
  graph: { interactions: number; tasteNodes: number; recommendationCandidates: number };
};

export type CommerceMemoryResult = {
  products: QuantProduct[];
  meta: CommerceMemoryMeta;
  canonicalTaste: CanonicalUserTaste;
  preferenceSignals: DeterministicPreferenceSignals;
  explain: MemoryExplainability;
  recommendationPrep: RecommendationPrepNode[];
  replayFingerprint: string;
};

export type CommerceMemoryInput = {
  products: QuantProduct[];
  query: string;
  sessionMemory?: CommerceSessionMemoryV1;
  canonicalProducts?: CanonicalProductNode[];
  trustResult?: TrustEngineResult | null;
};

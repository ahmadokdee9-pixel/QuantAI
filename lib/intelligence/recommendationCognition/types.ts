/**
 * Phase 7 — Recommendation cognition types (shadow-safe, deterministic).
 */

import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { CanonicalProductNode } from "@/lib/intelligence/identity/types";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { QuantProduct } from "@/lib/shoppingScore";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";

export const RECOMMENDATION_COGNITION_VERSION = "phase7.0";

export type LatentIntentProfile = {
  upgradeIntent01: number;
  luxuryIntent01: number;
  valueSeekingIntent01: number;
  urgency01: number;
  trustFirst01: number;
  aestheticDriven01: number;
  comparisonDriven01: number;
  impulseShopping01: number;
  analyticalShopping01: number;
};

export type PurchaseMotivationNode = {
  id: string;
  motivation: string;
  weight01: number;
};

export type IntentEvolutionSnapshot = {
  exploration01: number;
  commitment01: number;
  shoppingMaturity01: number;
  funnelNarrowing01: number;
  confidenceShift01: number;
  repeatPattern01: number;
  trajectoryId: string;
};

export type RecommendationExplainability = {
  whyRecommended: string[];
  whyCrossCategory: string[];
  whyBundleSuggested: string[];
  whyUpgradeDetected: string[];
  whyLuxuryIntentDetected: string[];
  whyValueIntentDetected: string[];
  whyRecommendationConfidence: string[];
};

export type ShadowRecommendationCandidate = {
  link: string;
  commerceId: string;
  deterministicScore: number;
  confidence01: number;
  trustBalance01: number;
  diversitySlot: number;
  rankingMutation: false;
  sequenceIndex: number;
};

export type RecommendationCognitionMeta = {
  version: string;
  enabled: boolean;
  shadowOnly: true;
  query: string;
  inputCount: number;
  candidateCount: number;
  graphNodeCount: number;
  avgConfidence01: number;
  diversityStability01: number;
  intentEvolutionScore: number;
  safetyBlockedCount: number;
  latencyMs: number;
  graph: {
    motivationNodes: number;
    relatedEdges: number;
    trajectorySteps: number;
    crossCategoryHints: number;
  };
};

export type RecommendationCognitionResult = {
  products: QuantProduct[];
  meta: RecommendationCognitionMeta;
  latentIntent: LatentIntentProfile;
  intentEvolution: IntentEvolutionSnapshot;
  explain: RecommendationExplainability;
  shadowCandidates: ShadowRecommendationCandidate[];
  replayFingerprint: string;
};

export type RecommendationCognitionInput = {
  products: QuantProduct[];
  query: string;
  sessionMemory?: CommerceSessionMemoryV1;
  canonicalProducts?: CanonicalProductNode[];
  trustResult?: TrustEngineResult | null;
  memoryResult?: CommerceMemoryResult | null;
};

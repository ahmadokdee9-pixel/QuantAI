/**
 * Phase 16 — Universal commerce intelligence types (shadow-only).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";
import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";
import type { PredictiveCommerceIntentResult } from "@/lib/intelligence/predictiveCommerceIntent/types";
import type { AutonomousCommerceStrategyResult } from "@/lib/intelligence/autonomousCommerceStrategy/types";
import type { ControlledActivationResult } from "@/lib/governance/controlledActivation/types";

export const UNIVERSAL_COMMERCE_INTELLIGENCE_VERSION = "universal_commerce_intelligence_v1";

export type UniversalVerticalId =
  | "fashion"
  | "luxury"
  | "beauty"
  | "furniture_home"
  | "automotive"
  | "sports_outdoor"
  | "watches_jewelry"
  | "gaming"
  | "electronics"
  | "general";

export type UniversalAxisId =
  | "category_cognition"
  | "cross_category"
  | "aesthetic"
  | "lifecycle"
  | "timing"
  | "trust"
  | "merchant"
  | "volatility"
  | "premium_utility"
  | "regional"
  | "ontology";

export type FusedUniversalSignal = {
  axisId: UniversalAxisId;
  verticalId: UniversalVerticalId;
  weight01: number;
  strength01: number;
  trustAdjusted01: number;
};

export type CrossCategoryGraphNode = {
  nodeId: string;
  verticalId: UniversalVerticalId;
  score01: number;
};

export type OntologyNode = {
  nodeId: string;
  concept: string;
  verticalId: UniversalVerticalId;
};

export type CategoryTimingNode = {
  nodeId: string;
  verticalId: UniversalVerticalId;
  timingScore01: number;
};

export type ShadowUniversalCandidate = {
  candidateId: string;
  verticalId: UniversalVerticalId;
  confidence01: number;
  maxInfluence01: number;
  rankingMutation: false;
};

export type UniversalCommerceIntelligenceMeta = {
  version: string;
  enabled: boolean;
  shadowOnly: true;
  query: string;
  inputCount: number;
  dominantVertical: UniversalVerticalId;
  verticalCount: number;
  graphNodeCount: number;
  ontologyNodeCount: number;
  fusedAxisCount: number;
  candidateCount: number;
  universalConfidence01: number;
  governanceAllowed: boolean;
  maxInfluence01: number;
  latencyMs: number;
};

export type UniversalCommerceIntelligenceInput = {
  products: QuantProduct[];
  query: string;
  trust?: TrustEngineResult | null;
  commerceOs?: AutonomousCommerceOsResult | null;
  commerceIdentity?: AutonomousCommerceIdentityResult | null;
  predictiveIntent?: PredictiveCommerceIntentResult | null;
  commerceStrategy?: AutonomousCommerceStrategyResult | null;
  activation?: ControlledActivationResult | null;
};

export type UniversalCommerceIntelligenceResult = {
  products: QuantProduct[];
  meta: UniversalCommerceIntelligenceMeta;
  categoryCognition: { dominantVertical: UniversalVerticalId; spread01: number };
  verticalIntelligence: Record<UniversalVerticalId, { score01: number; active: boolean }>;
  premiumUtility: { bias: "premium" | "utility" | "balanced"; score01: number };
  aesthetic: { aesthetic01: number; label: string };
  lifecycle: { phase: string; verticalTiming01: number };
  crossCategoryGraph: CrossCategoryGraphNode[];
  ontology: OntologyNode[];
  timingGraph: CategoryTimingNode[];
  fusedSignals: FusedUniversalSignal[];
  shadowCandidates: ShadowUniversalCandidate[];
  explain: {
    whyVertical: string[];
    whyCrossCategory: string[];
    whyAesthetic: string[];
    whyTrust: string[];
    whyGovernance: string[];
    whyFusion: string[];
    traceExamples: string[];
  };
  replayFingerprint: string;
};

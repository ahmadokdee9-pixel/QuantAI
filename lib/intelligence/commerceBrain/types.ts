/**
 * Phase 11 — Unified commerce brain types (shadow-safe, deterministic).
 */

import type { IdentityFoundationResult } from "@/lib/intelligence/identity/types";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";
import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";
import type { ControlledActivationResult } from "@/lib/governance/controlledActivation/types";
import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";
import type { QuantProduct } from "@/lib/shoppingScore";

export const COMMERCE_BRAIN_VERSION = "phase11.0";

export type IntelligenceLayerId =
  | "identity"
  | "trust"
  | "memory"
  | "taste"
  | "recommendation"
  | "commerce_os"
  | "activation"
  | "evolution";

export type FusedIntelligenceSignal = {
  layer: IntelligenceLayerId;
  signalId: string;
  weight01: number;
  confidence01: number;
};

export type BrainArbitrationVerdict = {
  primaryLayer: IntelligenceLayerId;
  secondaryLayer: IntelligenceLayerId;
  arbitrationScore01: number;
  rankingMutation: false;
};

export type UnifiedDecisionNode = {
  nodeId: string;
  layer: IntelligenceLayerId;
  priority: number;
  weight01: number;
};

export type SynthesizedRecommendation = {
  synthesisId: string;
  confidence01: number;
  maxInfluence01: number;
  candidateLinks: string[];
  rankingMutation: false;
};

export type BrainExplainability = {
  whyPrimaryLayer: string[];
  whyArbitration: string[];
  whyFusion: string[];
  whyTrustWeight: string[];
  whyTasteWeight: string[];
  whyTemporalWeight: string[];
  whySynthesis: string[];
  layerTraces: string[];
};

export type CommerceBrainMeta = {
  version: string;
  enabled: boolean;
  shadowOnly: true;
  query: string;
  inputCount: number;
  fusedSignalCount: number;
  decisionNodeCount: number;
  brainConfidence01: number;
  governanceAllowed: boolean;
  maxInfluence01: number;
  latencyMs: number;
};

export type CommerceBrainResult = {
  products: QuantProduct[];
  meta: CommerceBrainMeta;
  fusedSignals: FusedIntelligenceSignal[];
  arbitration: BrainArbitrationVerdict;
  decisionGraph: UnifiedDecisionNode[];
  synthesis: SynthesizedRecommendation;
  explain: BrainExplainability;
  replayFingerprint: string;
};

export type CommerceBrainInput = {
  products: QuantProduct[];
  query: string;
  identity?: IdentityFoundationResult | null;
  trust?: TrustEngineResult | null;
  memory?: CommerceMemoryResult | null;
  recommendation?: RecommendationCognitionResult | null;
  commerceOs?: AutonomousCommerceOsResult | null;
  activation?: ControlledActivationResult | null;
  evolution?: CommerceEvolutionResult | null;
};

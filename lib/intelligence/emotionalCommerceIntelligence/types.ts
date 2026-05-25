/**
 * Phase 17 — Emotional commerce intelligence types (shadow-only).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { ShopperPersonaProfile } from "@/lib/intelligence/shopperPersona";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";
import type { UniversalCommerceIntelligenceResult } from "@/lib/intelligence/universalCommerceIntelligence/types";
import type { AutonomousCommerceStrategyResult } from "@/lib/intelligence/autonomousCommerceStrategy/types";
import type { ControlledActivationResult } from "@/lib/governance/controlledActivation/types";

export const EMOTIONAL_COMMERCE_INTELLIGENCE_VERSION = "emotional_commerce_intelligence_v1";

export type EmotionalAxisId =
  | "aesthetic"
  | "lifestyle"
  | "premium_attraction"
  | "luxury_psychology"
  | "purchase_driver"
  | "impulse_rational"
  | "style_personality"
  | "emotional_trust"
  | "confidence_aspiration"
  | "comfort_status_utility"
  | "emotional_timing"
  | "lifecycle"
  | "regional";

export type FusedEmotionalSignal = {
  axisId: EmotionalAxisId;
  weight01: number;
  strength01: number;
  trustAdjusted01: number;
};

export type EmotionalGraphNode = {
  nodeId: string;
  emotion: string;
  intensity01: number;
};

export type TasteCognitionNode = {
  nodeId: string;
  trait: string;
  score01: number;
};

export type EmotionalLifecycleNode = {
  nodeId: string;
  phase: string;
  score01: number;
};

export type ShadowEmotionalCandidate = {
  candidateId: string;
  axisId: EmotionalAxisId;
  confidence01: number;
  maxInfluence01: number;
  rankingMutation: false;
};

export type EmotionalCommerceIntelligenceMeta = {
  version: string;
  enabled: boolean;
  shadowOnly: true;
  query: string;
  inputCount: number;
  emotionalGraphCount: number;
  tasteNodeCount: number;
  fusedAxisCount: number;
  candidateCount: number;
  emotionalConfidence01: number;
  stylePersonality: string;
  governanceAllowed: boolean;
  maxInfluence01: number;
  latencyMs: number;
};

export type EmotionalCommerceIntelligenceInput = {
  products: QuantProduct[];
  query: string;
  sessionMemory?: CommerceSessionMemoryV1;
  shopperPersona?: ShopperPersonaProfile | null;
  trust?: TrustEngineResult | null;
  memory?: CommerceMemoryResult | null;
  commerceIdentity?: AutonomousCommerceIdentityResult | null;
  universalCommerce?: UniversalCommerceIntelligenceResult | null;
  commerceStrategy?: AutonomousCommerceStrategyResult | null;
  activation?: ControlledActivationResult | null;
};

export type EmotionalCommerceIntelligenceResult = {
  products: QuantProduct[];
  meta: EmotionalCommerceIntelligenceMeta;
  aestheticIdentity: { minimalist01: number; maximalist01: number; label: string };
  lifestyle: { lifestyleLabel: string; alignment01: number };
  premiumAttraction: { attraction01: number; label: string };
  luxuryPsychology: { aspiration01: number; status01: number };
  purchaseDrivers: { driver: string; strength01: number };
  impulseRational: { impulse01: number; rational01: number; balance: string };
  stylePersonality: { personality: string; confidence01: number };
  emotionalTrust: { score01: number; label: string };
  confidenceAspiration: { confidence01: number; aspiration01: number };
  comfortStatusUtility: { comfort01: number; status01: number; utility01: number };
  emotionalTiming: { timingLabel: string; urgency01: number };
  emotionalLifecycle: { phase: string; continuity01: number };
  emotionalGraph: EmotionalGraphNode[];
  tasteCognitionGraph: TasteCognitionNode[];
  lifecycleGraph: EmotionalLifecycleNode[];
  fusedSignals: FusedEmotionalSignal[];
  shadowCandidates: ShadowEmotionalCandidate[];
  explain: {
    whyEmotional: string[];
    whyAesthetic: string[];
    whyLifestyle: string[];
    whyPremium: string[];
    whyGovernance: string[];
    whyFusion: string[];
    traceExamples: string[];
  };
  replayFingerprint: string;
};

/**
 * Phase 10 — Adaptive commerce evolution types (shadow-safe, deterministic).
 */

import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";
import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { ControlledActivationResult } from "@/lib/governance/controlledActivation/types";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { QuantProduct } from "@/lib/shoppingScore";

export const COMMERCE_EVOLUTION_VERSION = "phase10.0";

export type SeasonalEvolutionProfile = {
  seasonalShift01: number;
  holidayProximity01: number;
  launchWindow01: number;
  endOfLife01: number;
};

export type LifecyclePhase = "discovery" | "comparison" | "commitment" | "replacement";

export type CommerceLifecycleProfile = {
  phase: LifecyclePhase;
  lifecycleMaturity01: number;
  replacementCycle01: number;
  timingSensitivity01: number;
};

export type IntentTransitionSnapshot = {
  fromIntent: string;
  toIntent: string;
  transitionStrength01: number;
  explorationToCommitment01: number;
};

export type EvolvingTasteProfile = {
  tasteDrift01: number;
  premiumDrift01: number;
  valueDrift01: number;
  aestheticShift01: number;
};

export type EvolutionExplainability = {
  whySeasonalShift: string[];
  whyLifecyclePhase: string[];
  whyIntentTransition: string[];
  whyReplacementCycle: string[];
  whyTasteEvolution: string[];
  whyMarketTiming: string[];
  whyLongHorizonAdaptation: string[];
};

export type ShadowEvolutionCandidate = {
  horizon: "session" | "seasonal" | "replacement_cycle";
  adaptationId: string;
  confidence01: number;
  rankingMutation: false;
};

export type CommerceEvolutionMeta = {
  version: string;
  enabled: boolean;
  shadowOnly: true;
  query: string;
  inputCount: number;
  graphNodeCount: number;
  candidateCount: number;
  evolutionConfidence01: number;
  governanceAllowed: boolean;
  latencyMs: number;
};

export type CommerceEvolutionResult = {
  products: QuantProduct[];
  meta: CommerceEvolutionMeta;
  seasonal: SeasonalEvolutionProfile;
  lifecycle: CommerceLifecycleProfile;
  intentTransition: IntentTransitionSnapshot;
  tasteEvolution: EvolvingTasteProfile;
  explain: EvolutionExplainability;
  shadowCandidates: ShadowEvolutionCandidate[];
  replayFingerprint: string;
};

export type CommerceEvolutionInput = {
  products: QuantProduct[];
  query: string;
  sessionMemory?: CommerceSessionMemoryV1;
  memoryResult?: CommerceMemoryResult | null;
  recommendationResult?: RecommendationCognitionResult | null;
  commerceOsResult?: AutonomousCommerceOsResult | null;
  activationResult?: ControlledActivationResult | null;
};

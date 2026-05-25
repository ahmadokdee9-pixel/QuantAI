/**
 * Phase 14 — Predictive commerce intent types (shadow-only).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";
import type { CommerceBrainResult } from "@/lib/intelligence/commerceBrain/types";
import type { LiveCommerceSignalsResult } from "@/lib/intelligence/liveAdaptiveCommerceSignals/types";
import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";
import type { ControlledActivationResult } from "@/lib/governance/controlledActivation/types";
import type { ShopperPersonaProfile } from "@/lib/intelligence/shopperPersona";

export const PREDICTIVE_COMMERCE_INTENT_VERSION = "predictive_commerce_intent_v1";

export type PredictionAxisId =
  | "readiness"
  | "purchase_probability"
  | "replacement"
  | "upgrade"
  | "urgency"
  | "momentum"
  | "demand_accel"
  | "temporal"
  | "lifecycle"
  | "seasonal"
  | "regional"
  | "trend"
  | "confidence";

export type FusedPredictionSignal = {
  axisId: PredictionAxisId;
  weight01: number;
  strength01: number;
  trustAdjusted01: number;
};

export type PredictiveIntentGraphNode = {
  nodeId: string;
  axis: PredictionAxisId;
  score01: number;
};

export type FutureCommerceGraphNode = {
  nodeId: string;
  horizon: "immediate" | "session" | "seasonal" | "replacement";
  forecast01: number;
};

export type ShadowPredictiveCandidate = {
  candidateId: string;
  axisId: PredictionAxisId;
  confidence01: number;
  maxInfluence01: number;
  rankingMutation: false;
};

export type PredictiveCommerceIntentMeta = {
  version: string;
  enabled: boolean;
  shadowOnly: true;
  query: string;
  inputCount: number;
  graphNodeCount: number;
  futureNodeCount: number;
  fusedAxisCount: number;
  candidateCount: number;
  predictionConfidence01: number;
  readiness01: number;
  purchaseProbability01: number;
  governanceAllowed: boolean;
  maxInfluence01: number;
  latencyMs: number;
};

export type PredictiveCommerceIntentInput = {
  products: QuantProduct[];
  query: string;
  sessionMemory?: CommerceSessionMemoryV1;
  shopperPersona?: ShopperPersonaProfile | null;
  trust?: TrustEngineResult | null;
  evolution?: CommerceEvolutionResult | null;
  brain?: CommerceBrainResult | null;
  liveSignals?: LiveCommerceSignalsResult | null;
  commerceIdentity?: AutonomousCommerceIdentityResult | null;
  activation?: ControlledActivationResult | null;
};

export type PredictiveCommerceIntentResult = {
  products: QuantProduct[];
  meta: PredictiveCommerceIntentMeta;
  readiness: { readiness01: number; label: string };
  purchaseProbability: { probability01: number; horizon: string };
  replacementCycle: { cycle01: number; windowLabel: string };
  upgradeTiming: { timing01: number; label: string };
  urgency: { urgency01: number; tier: "low" | "moderate" | "high" };
  momentum: { momentum01: number; acceleration01: number };
  demandAcceleration: { accel01: number; direction: "up" | "stable" | "down" };
  temporalBuying: { horizon: string; score01: number };
  lifecycleForecast: { phase: string; forecast01: number };
  seasonalForecast: { seasonLabel: string; forecast01: number };
  regionalWeight: { regionLabel: string; weight01: number };
  trendAlignment: { alignment01: number; trendLabel: string };
  futureState: { stateLabel: string; confidence01: number };
  fusedSignals: FusedPredictionSignal[];
  intentGraph: PredictiveIntentGraphNode[];
  futureGraph: FutureCommerceGraphNode[];
  shadowCandidates: ShadowPredictiveCandidate[];
  explain: {
    whyReadiness: string[];
    whyPurchase: string[];
    whyTiming: string[];
    whyUrgency: string[];
    whyGovernance: string[];
    whyFusion: string[];
    traceExamples: string[];
  };
  replayFingerprint: string;
};

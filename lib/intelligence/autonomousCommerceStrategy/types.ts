/**
 * Phase 15 — Autonomous commerce strategy types (shadow-only).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";
import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";
import type { CommerceBrainResult } from "@/lib/intelligence/commerceBrain/types";
import type { LiveCommerceSignalsResult } from "@/lib/intelligence/liveAdaptiveCommerceSignals/types";
import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";
import type { PredictiveCommerceIntentResult } from "@/lib/intelligence/predictiveCommerceIntent/types";
import type { ControlledActivationResult } from "@/lib/governance/controlledActivation/types";
import type { ShopperPersonaProfile } from "@/lib/intelligence/shopperPersona";

export const AUTONOMOUS_COMMERCE_STRATEGY_VERSION = "autonomous_commerce_strategy_v1";

export type StrategyAxisId =
  | "trust_value_risk"
  | "timing"
  | "replacement"
  | "upgrade"
  | "affordability"
  | "economic"
  | "merchant"
  | "volatility"
  | "lifecycle"
  | "premium_value"
  | "regional"
  | "pressure"
  | "confidence";

export type FusedStrategySignal = {
  axisId: StrategyAxisId;
  weight01: number;
  strength01: number;
  trustAdjusted01: number;
};

export type CommerceStrategyGraphNode = {
  nodeId: string;
  axis: StrategyAxisId;
  score01: number;
};

export type ShadowStrategyCandidate = {
  candidateId: string;
  axisId: StrategyAxisId;
  confidence01: number;
  maxInfluence01: number;
  rankingMutation: false;
};

export type AutonomousCommerceStrategyMeta = {
  version: string;
  enabled: boolean;
  shadowOnly: true;
  query: string;
  inputCount: number;
  graphNodeCount: number;
  fusedAxisCount: number;
  candidateCount: number;
  strategyConfidence01: number;
  regretScore01: number;
  governanceAllowed: boolean;
  maxInfluence01: number;
  primaryStrategy: string;
  latencyMs: number;
};

export type AutonomousCommerceStrategyInput = {
  products: QuantProduct[];
  query: string;
  sessionMemory?: CommerceSessionMemoryV1;
  shopperPersona?: ShopperPersonaProfile | null;
  trust?: TrustEngineResult | null;
  commerceOs?: AutonomousCommerceOsResult | null;
  evolution?: CommerceEvolutionResult | null;
  brain?: CommerceBrainResult | null;
  liveSignals?: LiveCommerceSignalsResult | null;
  commerceIdentity?: AutonomousCommerceIdentityResult | null;
  predictiveIntent?: PredictiveCommerceIntentResult | null;
  activation?: ControlledActivationResult | null;
};

export type AutonomousCommerceStrategyResult = {
  products: QuantProduct[];
  meta: AutonomousCommerceStrategyMeta;
  trustValueRisk: { trust01: number; value01: number; risk01: number; balance01: number };
  timing: { timingScore01: number; label: string };
  replacement: { strategyLabel: string; score01: number };
  upgrade: { pathLabel: string; score01: number };
  affordability: { fit01: number; label: string };
  economicWeight: { climate: string; weight01: number };
  merchantArbitration: { verdict: string; score01: number };
  volatility: { band: string; strategy01: number };
  lifecycle: { phase: string; strategy01: number };
  premiumValue: { reasoning: string; premiumBias01: number };
  regional: { regionLabel: string; adaptation01: number };
  regret: { regret01: number; minimized: boolean };
  pressure: { balance01: number; dominantPressure: string };
  fusedSignals: FusedStrategySignal[];
  strategyGraph: CommerceStrategyGraphNode[];
  shadowCandidates: ShadowStrategyCandidate[];
  explain: {
    whyStrategy: string[];
    whyTiming: string[];
    whyTrustRisk: string[];
    whyRegret: string[];
    whyGovernance: string[];
    whyFusion: string[];
    traceExamples: string[];
  };
  replayFingerprint: string;
};

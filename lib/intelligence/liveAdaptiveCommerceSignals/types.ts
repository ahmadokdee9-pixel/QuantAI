/**
 * Phase 12 — Live adaptive commerce signals types (shadow-only).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";
import type { ControlledActivationResult } from "@/lib/governance/controlledActivation/types";
import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";
import type { CommerceBrainResult } from "@/lib/intelligence/commerceBrain/types";

export const LIVE_COMMERCE_SIGNALS_VERSION = "live_commerce_signals_v1";

export type LiveSignalId =
  | "market_interpretation"
  | "momentum"
  | "regional"
  | "category_pressure"
  | "macro_timing"
  | "demand_shift"
  | "pricing_climate"
  | "merchant_ecosystem"
  | "lifecycle_wave"
  | "seasonal_accel"
  | "volatility"
  | "trust_weighted";

export type FusedLiveSignal = {
  signalId: LiveSignalId;
  weight01: number;
  strength01: number;
  trustAdjusted01: number;
};

export type CommerceTimingNode = {
  nodeId: string;
  horizon: "immediate" | "session" | "seasonal" | "macro";
  score01: number;
};

export type ShadowLiveSignalCandidate = {
  candidateId: string;
  signalId: LiveSignalId;
  confidence01: number;
  maxInfluence01: number;
  rankingMutation: false;
};

export type ShadowSignalInfluenceEdge = {
  from: LiveSignalId;
  to: LiveSignalId;
  influence01: number;
};

export type LiveCommerceSignalsMeta = {
  version: string;
  enabled: boolean;
  shadowOnly: true;
  query: string;
  inputCount: number;
  fusedSignalCount: number;
  timingNodeCount: number;
  candidateCount: number;
  signalConfidence01: number;
  governanceAllowed: boolean;
  maxInfluence01: number;
  volatilityBand: "low" | "moderate" | "elevated";
  latencyMs: number;
};

export type LiveCommerceSignalsInput = {
  products: QuantProduct[];
  query: string;
  trust?: TrustEngineResult | null;
  memory?: CommerceMemoryResult | null;
  commerceOs?: AutonomousCommerceOsResult | null;
  activation?: ControlledActivationResult | null;
  evolution?: CommerceEvolutionResult | null;
  brain?: CommerceBrainResult | null;
};

export type LiveCommerceSignalsResult = {
  products: QuantProduct[];
  meta: LiveCommerceSignalsMeta;
  marketInterpretation: {
    liveMarketScore01: number;
    movementLabel: string;
  };
  momentum: { momentum01: number; acceleration01: number };
  regional: { regionalPressure01: number; regionLabel: string };
  categoryPressure: { pressure01: number; dominantCategory: string };
  macroTiming: { macroScore01: number; timingLabel: string };
  demandShift: { shift01: number; direction: "up" | "down" | "stable" };
  pricingClimate: { climate: string; evolution01: number };
  merchantEcosystem: { movement01: number; storeDiversity01: number };
  lifecycleWave: { wave01: number; phase: string };
  seasonal: { acceleration01: number; deceleration01: number };
  volatility: { volatility01: number; band: "low" | "moderate" | "elevated" };
  fusedSignals: FusedLiveSignal[];
  timingGraph: CommerceTimingNode[];
  forecast: { horizon: string; forecast01: number; bounded: true };
  influenceGraph: { edges: ShadowSignalInfluenceEdge[] };
  shadowCandidates: ShadowLiveSignalCandidate[];
  explain: {
    whyMarketMovement: string[];
    whyMomentum: string[];
    whyRegional: string[];
    whyDemandShift: string[];
    whyVolatility: string[];
    whyGovernance: string[];
    whyFusion: string[];
  };
  replayFingerprint: string;
};

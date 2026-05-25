/**
 * Phase 13 — Autonomous commerce identity types (shadow-only).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { IdentityFoundationResult } from "@/lib/intelligence/identity/types";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";
import type { CommerceBrainResult } from "@/lib/intelligence/commerceBrain/types";
import type { LiveCommerceSignalsResult } from "@/lib/intelligence/liveAdaptiveCommerceSignals/types";
import type { ControlledActivationResult } from "@/lib/governance/controlledActivation/types";
import type { ShopperPersonaProfile } from "@/lib/intelligence/shopperPersona";

export const AUTONOMOUS_COMMERCE_IDENTITY_VERSION = "autonomous_commerce_identity_v1";

export type IdentityAxisId =
  | "taste"
  | "category"
  | "premium"
  | "value"
  | "luxury"
  | "lifecycle"
  | "regional"
  | "intent"
  | "maturity"
  | "trust";

export type FusedIdentitySignal = {
  axisId: IdentityAxisId;
  weight01: number;
  strength01: number;
  trustAdjusted01: number;
};

export type CommercePersonaNode = {
  nodeId: string;
  personaLabel: string;
  affinity01: number;
};

export type IdentityGraphNode = {
  nodeId: string;
  axis: IdentityAxisId;
  score01: number;
};

export type ShadowIdentityCandidate = {
  candidateId: string;
  axisId: IdentityAxisId;
  confidence01: number;
  maxInfluence01: number;
  rankingMutation: false;
};

export type AutonomousIdentitySnapshot = {
  snapshotId: string;
  maturity01: number;
  drift01: number;
  continuity01: number;
};

export type AutonomousCommerceIdentityMeta = {
  version: string;
  enabled: boolean;
  shadowOnly: true;
  query: string;
  inputCount: number;
  graphNodeCount: number;
  personaNodeCount: number;
  fusedAxisCount: number;
  candidateCount: number;
  identityConfidence01: number;
  governanceAllowed: boolean;
  maxInfluence01: number;
  driftBand: "stable" | "moderate" | "elevated";
  latencyMs: number;
};

export type AutonomousCommerceIdentityInput = {
  products: QuantProduct[];
  query: string;
  sessionMemory?: CommerceSessionMemoryV1;
  shopperPersona?: ShopperPersonaProfile | null;
  identityFoundation?: IdentityFoundationResult | null;
  trust?: TrustEngineResult | null;
  memory?: CommerceMemoryResult | null;
  evolution?: CommerceEvolutionResult | null;
  brain?: CommerceBrainResult | null;
  liveSignals?: LiveCommerceSignalsResult | null;
  activation?: ControlledActivationResult | null;
};

export type AutonomousCommerceIdentityResult = {
  products: QuantProduct[];
  meta: AutonomousCommerceIdentityMeta;
  tasteFingerprint: { fingerprintId: string; premium01: number; value01: number; aesthetic01: number };
  categoryAffinity: { dominantCategory: string; evolution01: number };
  luxuryModel: { band: "value" | "balanced" | "premium" | "luxury"; score01: number };
  crossSessionPersonality: { personaId: string; stability01: number };
  lifecycleTransition: { fromPhase: string; toPhase: string; strength01: number };
  maturity: { maturity01: number; label: string };
  preferenceContinuity: { continuity01: number; decay01: number };
  intentPersistence: { intentLabel: string; persistence01: number };
  regionalCalibration: { regionLabel: string; calibration01: number };
  seasonalAdaptation: { adaptation01: number; seasonLabel: string };
  fusedSignals: FusedIdentitySignal[];
  personaGraph: CommercePersonaNode[];
  identityGraph: IdentityGraphNode[];
  snapshots: AutonomousIdentitySnapshot[];
  shadowCandidates: ShadowIdentityCandidate[];
  explain: {
    whyPersona: string[];
    whyTaste: string[];
    whyCategory: string[];
    whyMaturity: string[];
    whyDrift: string[];
    whyGovernance: string[];
    whyFusion: string[];
    traceExamples: string[];
  };
  replayFingerprint: string;
};

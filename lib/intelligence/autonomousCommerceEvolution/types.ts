/**
 * Phase 18 — Autonomous commerce evolution types (shadow-only).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CommerceSessionMemoryV1 } from "@/lib/intelligence/commerceSessionMemory";
import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { CommerceMemoryResult } from "@/lib/intelligence/memory/types";
import type { CommerceEvolutionResult } from "@/lib/intelligence/commerceEvolution/types";
import type { AutonomousCommerceIdentityResult } from "@/lib/intelligence/autonomousCommerceIdentity/types";
import type { UniversalCommerceIntelligenceResult } from "@/lib/intelligence/universalCommerceIntelligence/types";
import type { AutonomousCommerceStrategyResult } from "@/lib/intelligence/autonomousCommerceStrategy/types";
import type { EmotionalCommerceIntelligenceResult } from "@/lib/intelligence/emotionalCommerceIntelligence/types";
import type { ControlledActivationResult } from "@/lib/governance/controlledActivation/types";

export const AUTONOMOUS_COMMERCE_EVOLUTION_VERSION = "autonomous_commerce_evolution_v1";

export type EvolutionAxisId =
  | "heuristic"
  | "ontology"
  | "cognition"
  | "strategy"
  | "category"
  | "trust"
  | "lifecycle"
  | "regional"
  | "calibration"
  | "memory"
  | "pattern"
  | "temporal";

export type FusedEvolutionSignal = {
  axisId: EvolutionAxisId;
  weight01: number;
  strength01: number;
  trustAdjusted01: number;
};

export type EvolutionGraphNode = {
  nodeId: string;
  evolutionKind: string;
  delta01: number;
};

export type OntologyEvolutionNode = {
  nodeId: string;
  concept: string;
  refinement01: number;
};

export type TemporalEvolutionNode = {
  nodeId: string;
  phase: string;
  score01: number;
};

export type ShadowEvolutionCandidate = {
  candidateId: string;
  axisId: EvolutionAxisId;
  confidence01: number;
  maxInfluence01: number;
  rankingMutation: false;
};

export type AutonomousCommerceEvolutionMeta = {
  version: string;
  enabled: boolean;
  shadowOnly: true;
  query: string;
  inputCount: number;
  evolutionGraphCount: number;
  ontologyEvolutionCount: number;
  fusedAxisCount: number;
  candidateCount: number;
  evolutionConfidence01: number;
  calibrationBand: "stable" | "adapting" | "elevated";
  governanceAllowed: boolean;
  maxInfluence01: number;
  latencyMs: number;
};

export type AutonomousCommerceEvolutionInput = {
  products: QuantProduct[];
  query: string;
  sessionMemory?: CommerceSessionMemoryV1;
  trust?: TrustEngineResult | null;
  memory?: CommerceMemoryResult | null;
  commerceEvolution?: CommerceEvolutionResult | null;
  commerceIdentity?: AutonomousCommerceIdentityResult | null;
  universalCommerce?: UniversalCommerceIntelligenceResult | null;
  commerceStrategy?: AutonomousCommerceStrategyResult | null;
  emotionalCommerce?: EmotionalCommerceIntelligenceResult | null;
  activation?: ControlledActivationResult | null;
};

export type AutonomousCommerceEvolutionResult = {
  products: QuantProduct[];
  meta: AutonomousCommerceEvolutionMeta;
  heuristicEvolution: { heuristicId: string; delta01: number; label: string };
  ontologyRefinement: { refinedConcepts: string[]; refinement01: number };
  adaptiveCognition: { cognitionLabel: string; adapt01: number };
  strategyEvolution: { strategyBand: string; boundedDelta01: number };
  categoryEvolution: { vertical: string; evolution01: number };
  trustAdaptation: { adaptation01: number; label: string };
  lifecycleAdaptation: { fromPhase: string; toPhase: string; strength01: number };
  regionalAdaptation: { regionLabel: string; weight01: number };
  calibration: { calibration01: number; band: "stable" | "adapting" | "elevated" };
  patternSynthesis: { patternId: string; strength01: number };
  evolutionGraph: EvolutionGraphNode[];
  ontologyEvolution: OntologyEvolutionNode[];
  temporalLifecycle: TemporalEvolutionNode[];
  fusedSignals: FusedEvolutionSignal[];
  shadowCandidates: ShadowEvolutionCandidate[];
  explain: {
    whyEvolution: string[];
    whyOntology: string[];
    whyHeuristic: string[];
    whyGovernance: string[];
    whyFusion: string[];
    traceExamples: string[];
  };
  replayFingerprint: string;
};

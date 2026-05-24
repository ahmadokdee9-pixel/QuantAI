/**
 * Phase 3 — Shared types for unified controlled stack orchestration.
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { IntentApplyMeta } from "@/lib/intent/intentApply";
import type { IntentCanaryMeta } from "@/lib/intent/intentCanaryController";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentEvaluationMeta } from "@/lib/intent/intentEvaluationEngine";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentIntelligenceMeta } from "@/lib/intent/intentIntelligenceEngine";
import type { IntentObservabilityMeta } from "@/lib/intent/intentObservability";
import type { IntentOptimizationMeta } from "@/lib/intent/intentOptimizationEngine";
import type { IntentProductionApplyMeta } from "@/lib/intent/intentProductionApply";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusion";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/adaptiveReasoning";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionIntelligence";
import type { StrategyIntelligenceMeta } from "@/lib/strategy/strategyIntelligence";
import type { MarketIntelligenceMeta } from "@/lib/market/marketIntelligence";
import type { BehavioralCommerceMeta } from "@/lib/behavioral/behavioralCommerce";
import type { CognitionEngineMeta } from "@/lib/cognition/cognitionIntelligence";
import type { IntentCognitionMeta } from "@/lib/intent/intentIntelligence";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveIntelligence";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingIntelligence";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningIntelligence";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityIntelligence";
import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionIntelligence";
import type { AutonomousCommerceReasoningGraphMeta } from "@/lib/commerceReasoningGraph/commerceReasoningGraphIntelligence";
import type { UnifiedCognitiveGovernanceMeta } from "@/lib/cognitiveGovernance/cognitiveGovernanceIntelligence";
import type { EconomicWorldSimulationMeta } from "@/lib/economicWorldSimulation/economicWorldSimulationIntelligence";
import type { QuantProduct } from "@/lib/shoppingScore";

export type ControlledStackIntentBootstrap = {
  query: string;
  canonicalQuery: CanonicalQueryContract;
  intentIntelligence: IntentIntelligenceMeta;
  intentApply: IntentApplyMeta;
  intentProductionApply: IntentProductionApplyMeta;
  intentObservability: IntentObservabilityMeta;
  intentCanary: IntentCanaryMeta;
  intentEvaluation: IntentEvaluationMeta;
  intentOptimization: IntentOptimizationMeta;
  intentGovernance: IntentGovernanceMeta;
  intentCalibration: IntentCalibrationMeta;
  rankingStable: boolean;
  trayId?: string;
};

export type ControlledStackAccum = ControlledStackIntentBootstrap & {
  products: QuantProduct[];
  intentRuntime?: IntentRuntimeMeta;
  intentOrchestration?: IntentOrchestrationMeta;
  intentMemory?: IntentMemoryMeta;
  intentCoordination?: IntentCoordinationMeta;
  intentFusion?: IntentFusionMeta;
  adaptiveReasoning?: AdaptiveReasoningMeta;
  decisionIntelligence?: DecisionIntelligenceMeta;
  strategyIntelligence?: StrategyIntelligenceMeta;
  marketIntelligence?: MarketIntelligenceMeta;
  behavioralCommerce?: BehavioralCommerceMeta;
  cognitionEngine?: CognitionEngineMeta;
  intentCognition?: IntentCognitionMeta;
  multiObjectiveCommerce?: MultiObjectiveCommerceMeta;
  adaptiveStrategicRanking?: AdaptiveStrategicRankingMeta;
  memorylessCommerceLearning?: MemorylessCommerceLearningMeta;
  marketRealityIntelligence?: MarketRealityIntelligenceMeta;
  commerceDecisionIntelligence?: CommerceDecisionIntelligenceMeta;
  autonomousCommerceReasoningGraph?: AutonomousCommerceReasoningGraphMeta;
  unifiedCognitiveGovernance?: UnifiedCognitiveGovernanceMeta;
  economicWorldSimulation?: EconomicWorldSimulationMeta;
};

export type ControlledStackLayerMetas = {
  intentRuntime: IntentRuntimeMeta;
  intentOrchestration: IntentOrchestrationMeta;
  intentMemory: IntentMemoryMeta;
  intentCoordination: IntentCoordinationMeta;
  intentFusion: IntentFusionMeta;
  adaptiveReasoning: AdaptiveReasoningMeta;
  decisionIntelligence: DecisionIntelligenceMeta;
  strategyIntelligence: StrategyIntelligenceMeta;
  marketIntelligence: MarketIntelligenceMeta;
  behavioralCommerce: BehavioralCommerceMeta;
  cognitionEngine: CognitionEngineMeta;
  intentCognition: IntentCognitionMeta;
  multiObjectiveCommerce: MultiObjectiveCommerceMeta;
  adaptiveStrategicRanking: AdaptiveStrategicRankingMeta;
  memorylessCommerceLearning: MemorylessCommerceLearningMeta;
  marketRealityIntelligence: MarketRealityIntelligenceMeta;
  commerceDecisionIntelligence: CommerceDecisionIntelligenceMeta;
  autonomousCommerceReasoningGraph: AutonomousCommerceReasoningGraphMeta;
  unifiedCognitiveGovernance: UnifiedCognitiveGovernanceMeta;
  economicWorldSimulation: EconomicWorldSimulationMeta;
};

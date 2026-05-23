/**
 * Phase 1 — Central registry for P5–P6.9 controlled layer enablement (fast-path gating).
 */

import { isAdaptiveReasoningEnabled } from "@/lib/reasoning/reasoningFlags";
import { isDecisionIntelligenceEnabled } from "@/lib/decision/decisionFlags";
import { isStrategyIntelligenceEnabled } from "@/lib/strategy/strategyFlags";
import { isMarketIntelligenceEnabled } from "@/lib/market/marketFlags";
import { isBehavioralCommerceEnabled } from "@/lib/behavioral/behavioralFlags";
import { isCognitionEngineEnabled } from "@/lib/cognition/cognitionFlags";
import { isIntentCognitionEnabled } from "@/lib/intent/intentFlags";
import { isMultiObjectiveCommerceEnabled } from "@/lib/multiObjective/multiObjectiveFlags";
import { isAdaptiveStrategicRankingEnabled } from "@/lib/strategicRanking/strategicRankingFlags";
import { isMemorylessCommerceLearningEnabled } from "@/lib/memorylessLearning/memorylessLearningFlags";
import { isMarketRealityIntelligenceEnabled } from "@/lib/marketReality/marketRealityFlags";
import { isCommerceDecisionIntelligenceEnabled } from "@/lib/commerceDecision/commerceDecisionFlags";
import { isAutonomousCommerceReasoningGraphEnabled } from "@/lib/commerceReasoningGraph/commerceReasoningGraphFlags";
import { isUnifiedCognitiveGovernanceEnabled } from "@/lib/cognitiveGovernance/cognitiveGovernanceFlags";
import { isEconomicWorldSimulationEnabled } from "@/lib/economicWorldSimulation/economicWorldSimulationFlags";
import { isIntentRuntimeEnabled } from "@/lib/intent/intentRuntimeFlags";
import { isIntentOrchestrationEnabled } from "@/lib/intent/intentOrchestrationFlags";
import { isIntentMemoryEnabled } from "@/lib/intent/intentMemoryFlags";
import { isIntentCoordinationEnabled } from "@/lib/intent/intentCoordinationFlags";
import { isIntentFusionEnabled } from "@/lib/intent/intentFusionFlags";

export type ControlledLayerId =
  | "intent_runtime"
  | "intent_orchestration"
  | "intent_memory"
  | "intent_coordination"
  | "intent_fusion"
  | "adaptive_reasoning"
  | "decision_intelligence"
  | "strategy_intelligence"
  | "market_intelligence"
  | "behavioral_commerce"
  | "cognition_engine"
  | "intent_cognition"
  | "multi_objective"
  | "strategic_ranking"
  | "memoryless_learning"
  | "market_reality"
  | "commerce_decision"
  | "reasoning_graph"
  | "cognitive_governance"
  | "economic_simulation";

const LAYER_CHECKS: { id: ControlledLayerId; enabled: () => boolean }[] = [
  { id: "intent_runtime", enabled: isIntentRuntimeEnabled },
  { id: "intent_orchestration", enabled: isIntentOrchestrationEnabled },
  { id: "intent_memory", enabled: isIntentMemoryEnabled },
  { id: "intent_coordination", enabled: isIntentCoordinationEnabled },
  { id: "intent_fusion", enabled: isIntentFusionEnabled },
  { id: "adaptive_reasoning", enabled: isAdaptiveReasoningEnabled },
  { id: "decision_intelligence", enabled: isDecisionIntelligenceEnabled },
  { id: "strategy_intelligence", enabled: isStrategyIntelligenceEnabled },
  { id: "market_intelligence", enabled: isMarketIntelligenceEnabled },
  { id: "behavioral_commerce", enabled: isBehavioralCommerceEnabled },
  { id: "cognition_engine", enabled: isCognitionEngineEnabled },
  { id: "intent_cognition", enabled: isIntentCognitionEnabled },
  { id: "multi_objective", enabled: isMultiObjectiveCommerceEnabled },
  { id: "strategic_ranking", enabled: isAdaptiveStrategicRankingEnabled },
  { id: "memoryless_learning", enabled: isMemorylessCommerceLearningEnabled },
  { id: "market_reality", enabled: isMarketRealityIntelligenceEnabled },
  { id: "commerce_decision", enabled: isCommerceDecisionIntelligenceEnabled },
  { id: "reasoning_graph", enabled: isAutonomousCommerceReasoningGraphEnabled },
  { id: "cognitive_governance", enabled: isUnifiedCognitiveGovernanceEnabled },
  { id: "economic_simulation", enabled: isEconomicWorldSimulationEnabled },
];

export type ControlledStackRegistrySnapshot = {
  enabledCount: number;
  totalLayers: number;
  enabledLayerIds: ControlledLayerId[];
  fastPathEligible: boolean;
};

export function scanControlledStackRegistry(): ControlledStackRegistrySnapshot {
  const enabledLayerIds = LAYER_CHECKS.filter((l) => l.enabled()).map((l) => l.id);
  return {
    enabledCount: enabledLayerIds.length,
    totalLayers: LAYER_CHECKS.length,
    enabledLayerIds,
    fastPathEligible: enabledLayerIds.length === 0,
  };
}

export function isAnyControlledLayerEnabled(): boolean {
  return scanControlledStackRegistry().enabledCount > 0;
}

/** Shared top-N drift counter for replay/governance kernels. */
export function countRankingTopDrift(pre: string[], post: string[], n = 5): number {
  let drift = 0;
  for (let i = 0; i < Math.min(n, pre.length, post.length); i += 1) {
    if (pre[i] !== post[i]) drift += 1;
  }
  return drift;
}

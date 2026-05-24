/**
 * Phase 3 — Authoritative controlled layer execution (single dispatch table).
 */

import type { ControlledLayerId } from "./controlledStackRegistry";
import type { ControlledStackAccum } from "./controlledStackTypes";
import { applyControlledIntentRuntime } from "@/lib/intent/intentRuntimeController";
import { applyControlledIntentOrchestration } from "@/lib/intent/intentOrchestrator";
import { applyControlledIntentMemory } from "@/lib/intent/intentMemory";
import { applyControlledIntentCoordination } from "@/lib/intent/intentCoordination";
import { applyControlledIntentFusion } from "@/lib/intent/intentFusion";
import { applyControlledAdaptiveReasoning } from "@/lib/reasoning/adaptiveReasoning";
import { applyControlledDecisionIntelligence } from "@/lib/decision/decisionIntelligence";
import { applyControlledStrategyIntelligence } from "@/lib/strategy/strategyIntelligence";
import { applyControlledMarketIntelligence } from "@/lib/market/marketIntelligence";
import { applyControlledBehavioralCommerce } from "@/lib/behavioral/behavioralCommerce";
import { applyControlledCognitionEngine } from "@/lib/cognition/cognitionIntelligence";
import { applyControlledIntentCognition } from "@/lib/intent/intentIntelligence";
import { applyControlledMultiObjectiveCommerce } from "@/lib/multiObjective/multiObjectiveIntelligence";
import { applyControlledAdaptiveStrategicRanking } from "@/lib/strategicRanking/strategicRankingIntelligence";
import { applyControlledMemorylessCommerceLearning } from "@/lib/memorylessLearning/memorylessLearningIntelligence";
import { applyControlledMarketRealityIntelligence } from "@/lib/marketReality/marketRealityIntelligence";
import { applyControlledCommerceDecisionIntelligence } from "@/lib/commerceDecision/commerceDecisionIntelligence";
import { applyControlledAutonomousCommerceReasoningGraph } from "@/lib/commerceReasoningGraph/commerceReasoningGraphIntelligence";
import { applyControlledUnifiedCognitiveGovernance } from "@/lib/cognitiveGovernance/cognitiveGovernanceIntelligence";
import { applyControlledEconomicWorldSimulation } from "@/lib/economicWorldSimulation/economicWorldSimulationIntelligence";
import type { QuantProduct } from "@/lib/shoppingScore";

function preLinks(products: QuantProduct[]): string[] {
  return products.map((p) => p.link || p.title);
}

export function executeControlledLayer(
  layerId: ControlledLayerId,
  accum: ControlledStackAccum
): QuantProduct[] {
  const {
    products,
    query,
    canonicalQuery,
    intentIntelligence,
    intentApply,
    intentProductionApply,
    intentObservability,
    intentCanary,
    intentEvaluation,
    intentOptimization,
    intentGovernance,
    intentCalibration,
    rankingStable,
    trayId,
  } = accum;

  switch (layerId) {
    case "intent_runtime": {
      const r = applyControlledIntentRuntime({
        products,
        query,
        canonicalQuery,
        intentIntelligence,
        intentApply,
        intentProductionApply,
        intentObservability,
        intentCanary,
        intentEvaluation,
        intentOptimization,
        intentGovernance,
        intentCalibration,
        preOrderLinks: preLinks(products),
        rankingStable,
      });
      accum.intentRuntime = r.meta;
      return r.products;
    }
    case "intent_orchestration": {
      const r = applyControlledIntentOrchestration({
        products,
        evaluation: intentEvaluation,
        optimization: intentOptimization,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        preOrderLinks: preLinks(products),
      });
      accum.intentOrchestration = r.meta;
      return r.products;
    }
    case "intent_memory": {
      const r = applyControlledIntentMemory({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.intentMemory = r.meta;
      return r.products;
    }
    case "intent_coordination": {
      const r = applyControlledIntentCoordination({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.intentCoordination = r.meta;
      return r.products;
    }
    case "intent_fusion": {
      const r = applyControlledIntentFusion({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.intentFusion = r.meta;
      return r.products;
    }
    case "adaptive_reasoning": {
      const r = applyControlledAdaptiveReasoning({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        fusion: accum.intentFusion!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.adaptiveReasoning = r.meta;
      return r.products;
    }
    case "decision_intelligence": {
      const r = applyControlledDecisionIntelligence({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        fusion: accum.intentFusion!,
        reasoning: accum.adaptiveReasoning!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.decisionIntelligence = r.meta;
      return r.products;
    }
    case "strategy_intelligence": {
      const r = applyControlledStrategyIntelligence({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        fusion: accum.intentFusion!,
        reasoning: accum.adaptiveReasoning!,
        decision: accum.decisionIntelligence!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.strategyIntelligence = r.meta;
      return r.products;
    }
    case "market_intelligence": {
      const r = applyControlledMarketIntelligence({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        fusion: accum.intentFusion!,
        reasoning: accum.adaptiveReasoning!,
        decision: accum.decisionIntelligence!,
        strategy: accum.strategyIntelligence!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.marketIntelligence = r.meta;
      return r.products;
    }
    case "behavioral_commerce": {
      const r = applyControlledBehavioralCommerce({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        fusion: accum.intentFusion!,
        reasoning: accum.adaptiveReasoning!,
        decision: accum.decisionIntelligence!,
        strategy: accum.strategyIntelligence!,
        market: accum.marketIntelligence!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.behavioralCommerce = r.meta;
      return r.products;
    }
    case "cognition_engine": {
      const r = applyControlledCognitionEngine({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        fusion: accum.intentFusion!,
        reasoning: accum.adaptiveReasoning!,
        decision: accum.decisionIntelligence!,
        strategy: accum.strategyIntelligence!,
        market: accum.marketIntelligence!,
        behavioral: accum.behavioralCommerce!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.cognitionEngine = r.meta;
      return r.products;
    }
    case "intent_cognition": {
      const r = applyControlledIntentCognition({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        fusion: accum.intentFusion!,
        reasoning: accum.adaptiveReasoning!,
        decision: accum.decisionIntelligence!,
        strategy: accum.strategyIntelligence!,
        market: accum.marketIntelligence!,
        behavioral: accum.behavioralCommerce!,
        cognition: accum.cognitionEngine!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.intentCognition = r.meta;
      return r.products;
    }
    case "multi_objective": {
      const r = applyControlledMultiObjectiveCommerce({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        fusion: accum.intentFusion!,
        reasoning: accum.adaptiveReasoning!,
        decision: accum.decisionIntelligence!,
        strategy: accum.strategyIntelligence!,
        market: accum.marketIntelligence!,
        behavioral: accum.behavioralCommerce!,
        cognition: accum.cognitionEngine!,
        intent: accum.intentCognition!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.multiObjectiveCommerce = r.meta;
      return r.products;
    }
    case "strategic_ranking": {
      const r = applyControlledAdaptiveStrategicRanking({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        fusion: accum.intentFusion!,
        multiObjective: accum.multiObjectiveCommerce!,
        intent: accum.intentCognition!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.adaptiveStrategicRanking = r.meta;
      return r.products;
    }
    case "memoryless_learning": {
      const r = applyControlledMemorylessCommerceLearning({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        fusion: accum.intentFusion!,
        multiObjective: accum.multiObjectiveCommerce!,
        intent: accum.intentCognition!,
        strategic: accum.adaptiveStrategicRanking!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.memorylessCommerceLearning = r.meta;
      return r.products;
    }
    case "market_reality": {
      const r = applyControlledMarketRealityIntelligence({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        fusion: accum.intentFusion!,
        multiObjective: accum.multiObjectiveCommerce!,
        intent: accum.intentCognition!,
        strategic: accum.adaptiveStrategicRanking!,
        memoryless: accum.memorylessCommerceLearning!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.marketRealityIntelligence = r.meta;
      return r.products;
    }
    case "commerce_decision": {
      const r = applyControlledCommerceDecisionIntelligence({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        fusion: accum.intentFusion!,
        multiObjective: accum.multiObjectiveCommerce!,
        intent: accum.intentCognition!,
        strategic: accum.adaptiveStrategicRanking!,
        memoryless: accum.memorylessCommerceLearning!,
        marketReality: accum.marketRealityIntelligence!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.commerceDecisionIntelligence = r.meta;
      return r.products;
    }
    case "reasoning_graph": {
      const r = applyControlledAutonomousCommerceReasoningGraph({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        fusion: accum.intentFusion!,
        multiObjective: accum.multiObjectiveCommerce!,
        intent: accum.intentCognition!,
        strategic: accum.adaptiveStrategicRanking!,
        memoryless: accum.memorylessCommerceLearning!,
        marketReality: accum.marketRealityIntelligence!,
        commerceDecision: accum.commerceDecisionIntelligence!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.autonomousCommerceReasoningGraph = r.meta;
      return r.products;
    }
    case "cognitive_governance": {
      const r = applyControlledUnifiedCognitiveGovernance({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        fusion: accum.intentFusion!,
        multiObjective: accum.multiObjectiveCommerce!,
        intent: accum.intentCognition!,
        strategic: accum.adaptiveStrategicRanking!,
        memoryless: accum.memorylessCommerceLearning!,
        marketReality: accum.marketRealityIntelligence!,
        commerceDecision: accum.commerceDecisionIntelligence!,
        reasoningGraph: accum.autonomousCommerceReasoningGraph!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.unifiedCognitiveGovernance = r.meta;
      return r.products;
    }
    case "economic_simulation": {
      const r = applyControlledEconomicWorldSimulation({
        products,
        query,
        canonicalQuery,
        governance: intentGovernance,
        calibration: intentCalibration,
        runtime: accum.intentRuntime!,
        orchestration: accum.intentOrchestration!,
        memory: accum.intentMemory!,
        coordination: accum.intentCoordination!,
        fusion: accum.intentFusion!,
        multiObjective: accum.multiObjectiveCommerce!,
        intent: accum.intentCognition!,
        strategic: accum.adaptiveStrategicRanking!,
        memoryless: accum.memorylessCommerceLearning!,
        marketReality: accum.marketRealityIntelligence!,
        commerceDecision: accum.commerceDecisionIntelligence!,
        reasoningGraph: accum.autonomousCommerceReasoningGraph!,
        cognitiveGovernance: accum.unifiedCognitiveGovernance!,
        preOrderLinks: preLinks(products),
        trayId,
      });
      accum.economicWorldSimulation = r.meta;
      return r.products;
    }
    default:
      return products;
  }
}

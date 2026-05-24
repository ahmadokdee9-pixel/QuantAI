/**
 * Phase 3 — Deterministic P5.0→P6.9 layer DAG and routing metadata.
 */

import type { ControlledLayerId } from "./controlledStackRegistry";
import {
  getLayerContract,
  validateLayerContract,
  type LayerExecutionContract,
} from "./layerExecutionContract";

export type ControlledLayerRoute = {
  id: ControlledLayerId;
  order: number;
  contract: LayerExecutionContract;
  /** Meta key exported on search response. */
  metaKey: string;
  dependencies: ControlledLayerId[];
};

const ROUTE_DEFS: Omit<ControlledLayerRoute, "contract" | "order">[] = [
  { id: "intent_runtime", metaKey: "intentRuntime", dependencies: [] },
  { id: "intent_orchestration", metaKey: "intentOrchestration", dependencies: ["intent_runtime"] },
  { id: "intent_memory", metaKey: "intentMemory", dependencies: ["intent_orchestration"] },
  { id: "intent_coordination", metaKey: "intentCoordination", dependencies: ["intent_memory"] },
  { id: "intent_fusion", metaKey: "intentFusion", dependencies: ["intent_coordination"] },
  {
    id: "adaptive_reasoning",
    metaKey: "adaptiveReasoning",
    dependencies: ["intent_fusion"],
  },
  {
    id: "decision_intelligence",
    metaKey: "decisionIntelligence",
    dependencies: ["adaptive_reasoning"],
  },
  {
    id: "strategy_intelligence",
    metaKey: "strategyIntelligence",
    dependencies: ["decision_intelligence"],
  },
  {
    id: "market_intelligence",
    metaKey: "marketIntelligence",
    dependencies: ["strategy_intelligence"],
  },
  {
    id: "behavioral_commerce",
    metaKey: "behavioralCommerce",
    dependencies: ["market_intelligence"],
  },
  { id: "cognition_engine", metaKey: "cognitionEngine", dependencies: ["behavioral_commerce"] },
  { id: "intent_cognition", metaKey: "intentCognition", dependencies: ["cognition_engine"] },
  {
    id: "multi_objective",
    metaKey: "multiObjectiveCommerce",
    dependencies: ["intent_cognition"],
  },
  {
    id: "strategic_ranking",
    metaKey: "adaptiveStrategicRanking",
    dependencies: ["multi_objective"],
  },
  {
    id: "memoryless_learning",
    metaKey: "memorylessCommerceLearning",
    dependencies: ["strategic_ranking"],
  },
  {
    id: "market_reality",
    metaKey: "marketRealityIntelligence",
    dependencies: ["memoryless_learning"],
  },
  {
    id: "commerce_decision",
    metaKey: "commerceDecisionIntelligence",
    dependencies: ["market_reality"],
  },
  {
    id: "reasoning_graph",
    metaKey: "autonomousCommerceReasoningGraph",
    dependencies: ["commerce_decision"],
  },
  {
    id: "cognitive_governance",
    metaKey: "unifiedCognitiveGovernance",
    dependencies: ["reasoning_graph"],
  },
  {
    id: "economic_simulation",
    metaKey: "economicWorldSimulation",
    dependencies: ["cognitive_governance"],
  },
];

export const CONTROLLED_LAYER_ROUTES: ControlledLayerRoute[] = ROUTE_DEFS.map((def, index) => ({
  ...def,
  order: index,
  contract: getLayerContract(def.id),
}));

export function getControlledLayerRoute(id: ControlledLayerId): ControlledLayerRoute | undefined {
  return CONTROLLED_LAYER_ROUTES.find((r) => r.id === id);
}

export function validateRouterConsistency(): string[] {
  const errors: string[] = [];
  const ids = new Set(CONTROLLED_LAYER_ROUTES.map((r) => r.id));
  if (ids.size !== CONTROLLED_LAYER_ROUTES.length) {
    errors.push("duplicate layer ids in router");
  }
  for (const route of CONTROLLED_LAYER_ROUTES) {
    for (const dep of route.dependencies) {
      if (!ids.has(dep)) errors.push(`${route.id} missing dependency ${dep}`);
      const depRoute = getControlledLayerRoute(dep);
      if (depRoute && depRoute.order >= route.order) {
        errors.push(`${route.id} depends on ${dep} but order is not ascending`);
      }
    }
    errors.push(...validateLayerContract(route.contract).map((e) => `${route.id}: ${e}`));
  }
  return errors;
}

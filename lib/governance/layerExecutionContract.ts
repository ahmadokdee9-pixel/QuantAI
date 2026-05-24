/**
 * Phase 3 — Bounded execution contracts for controlled stack layers.
 */

import type { ControlledLayerId } from "./controlledStackRegistry";

export type LayerMutationPermission = "none" | "telemetry_only" | "bounded" | "full_safe";

export type LayerExecutionContract = {
  layerId: ControlledLayerId;
  version: string;
  /** Relative CPU weight estimate (1 = baseline). */
  executionCost: number;
  /** Soft latency budget ms for orchestration telemetry. */
  latencyBudgetMs: number;
  replaySafe: boolean;
  mutationPermission: LayerMutationPermission;
  shadowCapable: boolean;
  applyCapable: boolean;
  /** Max top-5 slot drift before kernel rollback in production hard-block mode. */
  maxTopDrift: number;
};

const DEFAULT_CONTRACT: Omit<LayerExecutionContract, "layerId"> = {
  version: "phase3",
  executionCost: 1,
  latencyBudgetMs: 12,
  replaySafe: true,
  mutationPermission: "telemetry_only",
  shadowCapable: true,
  applyCapable: false,
  maxTopDrift: 3,
};

/** Canonical contracts — applyCapable false until explicit canary sign-off. */
export const CONTROLLED_LAYER_CONTRACTS: Record<ControlledLayerId, LayerExecutionContract> = {
  intent_runtime: { ...DEFAULT_CONTRACT, layerId: "intent_runtime", latencyBudgetMs: 8, executionCost: 1.2 },
  intent_orchestration: { ...DEFAULT_CONTRACT, layerId: "intent_orchestration", latencyBudgetMs: 6 },
  intent_memory: { ...DEFAULT_CONTRACT, layerId: "intent_memory", latencyBudgetMs: 10 },
  intent_coordination: { ...DEFAULT_CONTRACT, layerId: "intent_coordination", latencyBudgetMs: 10 },
  intent_fusion: { ...DEFAULT_CONTRACT, layerId: "intent_fusion", latencyBudgetMs: 12 },
  adaptive_reasoning: { ...DEFAULT_CONTRACT, layerId: "adaptive_reasoning", latencyBudgetMs: 14 },
  decision_intelligence: { ...DEFAULT_CONTRACT, layerId: "decision_intelligence", latencyBudgetMs: 14 },
  strategy_intelligence: { ...DEFAULT_CONTRACT, layerId: "strategy_intelligence", latencyBudgetMs: 14 },
  market_intelligence: { ...DEFAULT_CONTRACT, layerId: "market_intelligence", latencyBudgetMs: 12 },
  behavioral_commerce: { ...DEFAULT_CONTRACT, layerId: "behavioral_commerce", latencyBudgetMs: 12 },
  cognition_engine: { ...DEFAULT_CONTRACT, layerId: "cognition_engine", latencyBudgetMs: 16 },
  intent_cognition: { ...DEFAULT_CONTRACT, layerId: "intent_cognition", latencyBudgetMs: 14 },
  multi_objective: { ...DEFAULT_CONTRACT, layerId: "multi_objective", latencyBudgetMs: 16 },
  strategic_ranking: {
    ...DEFAULT_CONTRACT,
    layerId: "strategic_ranking",
    latencyBudgetMs: 18,
    mutationPermission: "bounded",
    applyCapable: true,
  },
  memoryless_learning: { ...DEFAULT_CONTRACT, layerId: "memoryless_learning", latencyBudgetMs: 14 },
  market_reality: { ...DEFAULT_CONTRACT, layerId: "market_reality", latencyBudgetMs: 16 },
  commerce_decision: { ...DEFAULT_CONTRACT, layerId: "commerce_decision", latencyBudgetMs: 16 },
  reasoning_graph: { ...DEFAULT_CONTRACT, layerId: "reasoning_graph", latencyBudgetMs: 20, executionCost: 1.5 },
  cognitive_governance: { ...DEFAULT_CONTRACT, layerId: "cognitive_governance", latencyBudgetMs: 22, executionCost: 1.6 },
  economic_simulation: { ...DEFAULT_CONTRACT, layerId: "economic_simulation", latencyBudgetMs: 24, executionCost: 1.7 },
};

export function getLayerContract(layerId: ControlledLayerId): LayerExecutionContract {
  return CONTROLLED_LAYER_CONTRACTS[layerId];
}

export function validateLayerContract(contract: LayerExecutionContract): string[] {
  const errors: string[] = [];
  if (contract.latencyBudgetMs <= 0) errors.push("latencyBudgetMs must be > 0");
  if (contract.executionCost <= 0) errors.push("executionCost must be > 0");
  if (!contract.replaySafe) errors.push("controlled layers must be replaySafe");
  if (contract.applyCapable && contract.mutationPermission === "none") {
    errors.push("applyCapable layers cannot have mutationPermission none");
  }
  return errors;
}

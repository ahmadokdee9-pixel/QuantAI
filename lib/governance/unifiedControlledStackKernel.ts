/**
 * Phase 3 — Unified controlled stack orchestration kernel (authoritative execution flow).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import {
  scanControlledStackRegistry,
  isControlledLayerEnabled,
  type ControlledStackRegistrySnapshot,
} from "./controlledStackRegistry";
import { CONTROLLED_LAYER_ROUTES } from "./deterministicLayerRouter";
import { executeControlledLayer } from "./controlledStackLayerRunners";
import type {
  ControlledStackAccum,
  ControlledStackIntentBootstrap,
  ControlledStackLayerMetas,
} from "./controlledStackTypes";
import {
  enforceControlledLayerRankingInvariant,
  resolveGlobalMutationPolicy,
} from "./applyMutationGuard";
import { buildReplayTrace, type DeterministicReplayTrace } from "./replayKernel";

export type OrchestrationLayerRecord = {
  layerId: string;
  order: number;
  enabled: boolean;
  executed: boolean;
  skipped: boolean;
  skipReason?: string;
  latencyMs: number;
  budgetMs: number;
  rolledBack: boolean;
  drift: number;
  earlyReturnReason?: string;
};

export type ControlledStackOrchestrationGraph = {
  version: "phase3";
  fastPath: boolean;
  mutationPolicyReason: string;
  layers: OrchestrationLayerRecord[];
  replayTraces: DeterministicReplayTrace[];
};

export type UnifiedControlledStackInput = {
  products: QuantProduct[];
  intent: ControlledStackIntentBootstrap;
  registry?: ControlledStackRegistrySnapshot;
};

export type UnifiedControlledStackResult = {
  products: QuantProduct[];
  metas: ControlledStackLayerMetas;
  latencyMs: number;
  orchestration: ControlledStackOrchestrationGraph;
  registry: ControlledStackRegistrySnapshot;
  rankingMutation: boolean;
};

function accumToMetas(accum: ControlledStackAccum): ControlledStackLayerMetas {
  return {
    intentRuntime: accum.intentRuntime!,
    intentOrchestration: accum.intentOrchestration!,
    intentMemory: accum.intentMemory!,
    intentCoordination: accum.intentCoordination!,
    intentFusion: accum.intentFusion!,
    adaptiveReasoning: accum.adaptiveReasoning!,
    decisionIntelligence: accum.decisionIntelligence!,
    strategyIntelligence: accum.strategyIntelligence!,
    marketIntelligence: accum.marketIntelligence!,
    behavioralCommerce: accum.behavioralCommerce!,
    cognitionEngine: accum.cognitionEngine!,
    intentCognition: accum.intentCognition!,
    multiObjectiveCommerce: accum.multiObjectiveCommerce!,
    adaptiveStrategicRanking: accum.adaptiveStrategicRanking!,
    memorylessCommerceLearning: accum.memorylessCommerceLearning!,
    marketRealityIntelligence: accum.marketRealityIntelligence!,
    commerceDecisionIntelligence: accum.commerceDecisionIntelligence!,
    autonomousCommerceReasoningGraph: accum.autonomousCommerceReasoningGraph!,
    unifiedCognitiveGovernance: accum.unifiedCognitiveGovernance!,
    economicWorldSimulation: accum.economicWorldSimulation!,
  };
}

/**
 * Single authoritative P5.0→P6.9 orchestration — skips disabled layers, enforces production mutation block.
 */
export function runUnifiedControlledStack(
  input: UnifiedControlledStackInput
): UnifiedControlledStackResult {
  const started = Date.now();
  const registry = input.registry ?? scanControlledStackRegistry();
  const mutationPolicy = resolveGlobalMutationPolicy();
  const preStackLinks = input.products.map((p) => p.link || p.title).slice(0, 5);

  const layers: OrchestrationLayerRecord[] = [];
  const replayTraces: DeterministicReplayTrace[] = [];

  const accum: ControlledStackAccum = {
    ...input.intent,
    products: [...input.products],
  };

  let rankingMutation = false;

  for (const route of CONTROLLED_LAYER_ROUTES) {
    const enabled = isControlledLayerEnabled(route.id);
    const layerStarted = Date.now();
    const baseline = [...accum.products];

    // Layers self-short-circuit when disabled; kernel always dispatches for meta chain coherence.
    const candidate = executeControlledLayer(route.id, accum);
    const invariant = enforceControlledLayerRankingInvariant({
      layerId: route.id,
      baseline,
      candidate,
      policy: mutationPolicy,
    });

    accum.products = invariant.products;
    if (invariant.rolledBack) rankingMutation = rankingMutation || invariant.drift > 0;

    const trace = buildReplayTrace({
      layerId: route.id,
      preProducts: baseline,
      postProducts: accum.products,
      rolledBack: invariant.rolledBack,
      skipReason: invariant.reason,
    });
    replayTraces.push(trace);

    layers.push({
      layerId: route.id,
      order: route.order,
      enabled,
      executed: true,
      skipped: !enabled,
      skipReason: enabled ? undefined : "layer_disabled_telemetry_only",
      latencyMs: Date.now() - layerStarted,
      budgetMs: route.contract.latencyBudgetMs,
      rolledBack: invariant.rolledBack,
      drift: trace.drift,
      earlyReturnReason: invariant.reason,
    });
  }

  const postLinks = accum.products.map((p) => p.link || p.title).slice(0, 5);
  for (let i = 0; i < Math.min(5, preStackLinks.length, postLinks.length); i += 1) {
    if (preStackLinks[i] !== postLinks[i]) rankingMutation = true;
  }

  const graph: ControlledStackOrchestrationGraph = {
    version: "phase3",
    fastPath: registry.fastPathEligible,
    mutationPolicyReason: mutationPolicy.reason,
    layers,
    replayTraces,
  };

  return {
    products: accum.products,
    metas: accumToMetas(accum),
    latencyMs: Date.now() - started,
    orchestration: graph,
    registry,
    rankingMutation,
  };
}

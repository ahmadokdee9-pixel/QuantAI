/**
 * Phase 10 — Authoritative commerce evolution (shadow-safe).
 */

import type { CommerceEvolutionInput, CommerceEvolutionResult, CommerceEvolutionMeta } from "./types";
import { COMMERCE_EVOLUTION_VERSION } from "./types";
import { readCommerceEvolutionFlags } from "./flags";
import { runBoundedEvolutionEngine } from "./engine/boundedEvolutionEngine";
import { buildEvolutionReplayFingerprint } from "./replay/deterministicEvolutionExecution";
import {
  snapshotEvolutionOrchestration,
  type EvolutionOrchestrationSnapshot,
} from "./evolutionOrchestration";
import { MAX_EVOLUTION_BYTES } from "./replay/evolutionReplayContracts";
import {
  EMPTY_COMMERCE_SESSION_MEMORY,
  type CommerceSessionMemoryV1,
} from "@/lib/intelligence/commerceSessionMemory";

export type BuildCommerceEvolutionOptions = {
  sessionMemory?: CommerceSessionMemoryV1;
};

/**
 * Build adaptive commerce evolution layer. Does NOT mutate ranking or APPLY.
 */
export function buildCommerceEvolution(
  input: CommerceEvolutionInput,
  options: BuildCommerceEvolutionOptions = {}
): CommerceEvolutionResult {
  const started = Date.now();
  const flags = readCommerceEvolutionFlags();
  const sessionMemory = options.sessionMemory ?? input.sessionMemory ?? EMPTY_COMMERCE_SESSION_MEMORY;

  const empty = (): CommerceEvolutionResult => ({
    products: input.products,
    meta: {
      version: COMMERCE_EVOLUTION_VERSION,
      enabled: flags.enabled,
      shadowOnly: true,
      query: input.query,
      inputCount: input.products.length,
      graphNodeCount: 0,
      candidateCount: 0,
      evolutionConfidence01: 0,
      governanceAllowed: false,
      latencyMs: Date.now() - started,
    },
    seasonal: { seasonalShift01: 0, holidayProximity01: 0, launchWindow01: 0, endOfLife01: 0 },
    lifecycle: {
      phase: "discovery",
      lifecycleMaturity01: 0,
      replacementCycle01: 0,
      timingSensitivity01: 0,
    },
    intentTransition: {
      fromIntent: "neutral",
      toIntent: "neutral",
      transitionStrength01: 0,
      explorationToCommitment01: 0,
    },
    tasteEvolution: { tasteDrift01: 0, premiumDrift01: 0, valueDrift01: 0, aestheticShift01: 0 },
    explain: {
      whySeasonalShift: [],
      whyLifecyclePhase: [],
      whyIntentTransition: [],
      whyReplacementCycle: [],
      whyTasteEvolution: [],
      whyMarketTiming: [],
      whyLongHorizonAdaptation: [],
    },
    shadowCandidates: [],
    replayFingerprint: "evo_disabled",
  });

  if (!flags.enabled || input.products.length === 0) return empty();

  const engine = runBoundedEvolutionEngine(input, sessionMemory);
  const cognitionBytes = Math.min(
    MAX_EVOLUTION_BYTES,
    engine.memoryGraph.nodes.length * 48 + engine.shadowCandidates.length * 64
  );
  void cognitionBytes;

  const meta: CommerceEvolutionMeta = {
    version: COMMERCE_EVOLUTION_VERSION,
    enabled: true,
    shadowOnly: true,
    query: input.query,
    inputCount: input.products.length,
    graphNodeCount: engine.memoryGraph.nodes.length,
    candidateCount: engine.shadowCandidates.length,
    evolutionConfidence01: engine.evolutionConfidence01,
    governanceAllowed: engine.governance.allowed,
    latencyMs: Date.now() - started,
  };

  const result: CommerceEvolutionResult = {
    products: input.products,
    meta,
    seasonal: engine.seasonal,
    lifecycle: engine.lifecycle,
    intentTransition: engine.intentTransition,
    tasteEvolution: engine.tasteEvolution,
    explain: engine.explain,
    shadowCandidates: engine.shadowCandidates,
    replayFingerprint: "",
  };
  result.replayFingerprint = buildEvolutionReplayFingerprint(result);
  return result;
}

export function commerceEvolutionMetaForSearch(
  result: CommerceEvolutionResult,
  orchestration?: EvolutionOrchestrationSnapshot
): Record<string, unknown> {
  if (!result.meta.enabled) return {};

  return {
    commerceEvolution: {
      ...result.meta,
      replayFingerprint: result.replayFingerprint,
      orchestration,
      lifecyclePhase: result.lifecycle.phase,
      temporalHorizon: result.shadowCandidates[0]?.horizon ?? null,
    },
    commerceEvolutionShadow: {
      seasonalEvolution: result.seasonal,
      intentTransition: result.intentTransition,
      tasteEvolution: result.tasteEvolution,
      explainSample: {
        whyLifecyclePhase: result.explain.whyLifecyclePhase.slice(0, 3),
        whyLongHorizonAdaptation: result.explain.whyLongHorizonAdaptation.slice(0, 4),
      },
      evolutionCandidates: result.shadowCandidates.slice(0, 4).map((c) => ({
        adaptationId: c.adaptationId,
        horizon: c.horizon,
        confidence01: c.confidence01,
        rankingMutation: false,
      })),
      governanceReasons: result.meta.governanceAllowed ? [] : ["governance_blocked"],
      boundedCognition: {
        graphNodes: result.meta.graphNodeCount,
        confidence: result.meta.evolutionConfidence01,
      },
    },
  };
}

export { snapshotEvolutionOrchestration };

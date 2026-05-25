/**
 * Phase 18 — Autonomous commerce evolution (shadow-safe, no production mutation).
 */

import type {
  AutonomousCommerceEvolutionInput,
  AutonomousCommerceEvolutionResult,
  AutonomousCommerceEvolutionMeta,
} from "./types";
import { AUTONOMOUS_COMMERCE_EVOLUTION_VERSION } from "./types";
import { readAutonomousCommerceEvolutionFlags } from "./flags";
import { runAutonomousEvolutionKernel } from "./kernel/autonomousEvolutionKernel";
import { buildEvolutionReplayFingerprint } from "./replay/deterministicEvolutionExecution";
import {
  snapshotAutonomousEvolutionOrchestration,
  type EvolutionOrchestrationSnapshot,
} from "./orchestrator/commerceAdaptationOrchestrator";

/**
 * Build autonomous commerce evolution. Does NOT mutate ranking, APPLY, or production logic.
 */
export function buildAutonomousCommerceEvolution(
  input: AutonomousCommerceEvolutionInput
): AutonomousCommerceEvolutionResult {
  const started = Date.now();
  const flags = readAutonomousCommerceEvolutionFlags();
  const { products, query } = input;

  const empty = (): AutonomousCommerceEvolutionResult => ({
    products,
    meta: {
      version: AUTONOMOUS_COMMERCE_EVOLUTION_VERSION,
      enabled: flags.enabled,
      shadowOnly: true,
      query,
      inputCount: products.length,
      evolutionGraphCount: 0,
      ontologyEvolutionCount: 0,
      fusedAxisCount: 0,
      candidateCount: 0,
      evolutionConfidence01: 0,
      calibrationBand: "stable",
      governanceAllowed: false,
      maxInfluence01: 0,
      latencyMs: Date.now() - started,
    },
    heuristicEvolution: { heuristicId: "none", delta01: 0, label: "heuristic_stable" },
    ontologyRefinement: { refinedConcepts: [], refinement01: 0 },
    adaptiveCognition: { cognitionLabel: "synthesis_stable", adapt01: 0 },
    strategyEvolution: { strategyBand: "balanced_evolution", boundedDelta01: 0 },
    categoryEvolution: { vertical: "general", evolution01: 0 },
    trustAdaptation: { adaptation01: 0, label: "trust_calibration_stable" },
    lifecycleAdaptation: { fromPhase: "discovery", toPhase: "discovery", strength01: 0 },
    regionalAdaptation: { regionLabel: "global_neutral", weight01: 0 },
    calibration: { calibration01: 0, band: "stable" },
    patternSynthesis: { patternId: "pattern_general_browse", strength01: 0 },
    evolutionGraph: [],
    ontologyEvolution: [],
    temporalLifecycle: [],
    fusedSignals: [],
    shadowCandidates: [],
    explain: {
      whyEvolution: [],
      whyOntology: [],
      whyHeuristic: [],
      whyGovernance: ["disabled"],
      whyFusion: [],
      traceExamples: [],
    },
    replayFingerprint: "ace_disabled",
  });

  if (!flags.enabled || products.length === 0) return empty();

  const kernel = runAutonomousEvolutionKernel(input, flags.maxInfluence01);

  const meta: AutonomousCommerceEvolutionMeta = {
    version: AUTONOMOUS_COMMERCE_EVOLUTION_VERSION,
    enabled: true,
    shadowOnly: true,
    query,
    inputCount: products.length,
    evolutionGraphCount: kernel.evolutionGraph.length,
    ontologyEvolutionCount: kernel.ontologyEvolution.length,
    fusedAxisCount: kernel.fusedSignals.length,
    candidateCount: kernel.shadowCandidates.length,
    evolutionConfidence01: kernel.evolutionConfidence01,
    calibrationBand: kernel.calibration.band,
    governanceAllowed: kernel.governanceAllowed,
    maxInfluence01: flags.maxInfluence01,
    latencyMs: Date.now() - started,
  };

  const result: AutonomousCommerceEvolutionResult = {
    products,
    meta,
    heuristicEvolution: kernel.heuristicEvolution,
    ontologyRefinement: kernel.ontologyRefinement,
    adaptiveCognition: kernel.adaptiveCognition,
    strategyEvolution: kernel.strategyEvolution,
    categoryEvolution: kernel.categoryEvolution,
    trustAdaptation: kernel.trustAdaptation,
    lifecycleAdaptation: kernel.lifecycleAdaptation,
    regionalAdaptation: kernel.regionalAdaptation,
    calibration: kernel.calibration,
    patternSynthesis: kernel.patternSynthesis,
    evolutionGraph: kernel.evolutionGraph,
    ontologyEvolution: kernel.ontologyEvolution,
    temporalLifecycle: kernel.temporalLifecycle,
    fusedSignals: kernel.fusedSignals,
    shadowCandidates: kernel.shadowCandidates,
    explain: kernel.explain,
    replayFingerprint: "",
  };
  result.replayFingerprint = buildEvolutionReplayFingerprint(result);
  return result;
}

export function autonomousCommerceEvolutionMetaForSearch(
  result: AutonomousCommerceEvolutionResult,
  orchestration?: EvolutionOrchestrationSnapshot
): Record<string, unknown> {
  if (!result.meta.enabled) return {};

  return {
    autonomousCommerceEvolution: {
      ...result.meta,
      replayFingerprint: result.replayFingerprint,
      orchestration,
      heuristicId: result.heuristicEvolution.heuristicId,
      calibrationBand: result.calibration.band,
    },
    autonomousCommerceEvolutionShadow: {
      heuristicEvolution: result.heuristicEvolution,
      ontologyRefinement: result.ontologyRefinement,
      categoryEvolution: result.categoryEvolution,
      evolutionGraphSample: result.evolutionGraph.slice(0, 4),
      ontologyEvolutionSample: result.ontologyEvolution.slice(0, 4),
      temporalLifecycleSample: result.temporalLifecycle.slice(0, 3),
      fusedSignalsSample: result.fusedSignals.slice(0, 6).map((s) => ({
        axisId: s.axisId,
        trustAdjusted01: s.trustAdjusted01,
      })),
      explainSample: {
        whyEvolution: result.explain.whyEvolution,
        whyGovernance: result.explain.whyGovernance.slice(0, 4),
        traceExamples: result.explain.traceExamples,
      },
      shadowCandidates: result.shadowCandidates.slice(0, 4).map((c) => ({
        candidateId: c.candidateId,
        axisId: c.axisId,
        rankingMutation: false,
      })),
      governanceReasons: result.meta.governanceAllowed ? [] : result.explain.whyGovernance,
      boundedInfluence: result.meta.maxInfluence01,
    },
  };
}

export { snapshotAutonomousEvolutionOrchestration };

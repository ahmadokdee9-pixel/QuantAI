/**
 * Phase 18 — Autonomous evolution kernel.
 */

import type { AutonomousCommerceEvolutionInput, EvolutionAxisId } from "../types";
import { EMPTY_COMMERCE_SESSION_MEMORY } from "@/lib/intelligence/commerceSessionMemory";
import { synthesizeCommerceEvolutionContext } from "../engine/commerceEvolutionEngine";
import { evolveCommerceHeuristics } from "../heuristic/commerceHeuristicEvolution";
import { refineOntology } from "../ontology/ontologyRefinementEngine";
import { adaptCommerceCognition } from "../cognition/adaptiveCommerceCognition";
import { evolveBoundedStrategy } from "../strategy/boundedStrategyEvolution";
import { evolveCategoryIntelligence } from "../category/categoryIntelligenceEvolution";
import { modelTrustAdaptation } from "../trust/trustAdaptationModeling";
import { evolveLifecycleAdaptation } from "../lifecycle/lifecycleAdaptationEvolution";
import { evolveRegionalAdaptation } from "../regional/regionalAdaptationEvolution";
import { runAutonomousCalibration } from "../calibration/autonomousCalibrationEngine";
import { evolveLongTermMemory } from "../memory/longTermCommerceMemoryEvolution";
import { buildReplaySafeEvolutionMemory } from "../memory/replaySafeEvolutionMemory";
import { synthesizeCommercePatterns } from "../pattern/commercePatternSynthesis";
import { buildDeterministicEvolutionGraph } from "../graph/deterministicEvolutionGraph";
import { buildTemporalEvolutionLifecycle } from "../temporal/temporalEvolutionLifecycle";
import {
  fuseDeterministicEvolutionSignals,
  computeFusedEvolutionScore,
} from "../fusion/deterministicEvolutionFusion";
import { arbitrateEvolutionCognition } from "../governance/evolutionGovernanceVeto";
import { arbitrateEvolutionSignals } from "../arbitration/deterministicEvolutionArbitration";
import { buildShadowEvolutionCandidates } from "../candidates/shadowEvolutionCandidates";
import { buildEvolutionExplainability } from "../explain/evolutionExplainabilityEngine";
import { verifyEvolutionReplayIntegrity } from "../replay/evolutionReplayIntegrity";

export type AutonomousEvolutionKernelResult = Omit<
  import("../types").AutonomousCommerceEvolutionResult,
  "products" | "meta" | "replayFingerprint"
> & {
  evolutionConfidence01: number;
  governanceAllowed: boolean;
};

export function runAutonomousEvolutionKernel(
  input: AutonomousCommerceEvolutionInput,
  maxInfluence01: number
): AutonomousEvolutionKernelResult {
  const sessionMemory = input.sessionMemory ?? EMPTY_COMMERCE_SESSION_MEMORY;
  const ctx = synthesizeCommerceEvolutionContext(input);
  void verifyEvolutionReplayIntegrity(input);

  const heuristicEvolution = evolveCommerceHeuristics({
    query: input.query,
    upstreamDelta01: ctx.upstreamDelta01,
  });
  const categoryEvolution = evolveCategoryIntelligence({
    query: input.query,
    universalCommerce: input.universalCommerce,
  });
  const ontology = refineOntology({
    query: input.query,
    dominantVertical: categoryEvolution.vertical,
  });
  const adaptiveCognition = adaptCommerceCognition({
    query: input.query,
    emotionalConfidence01: input.emotionalCommerce?.meta.emotionalConfidence01 ?? 0.3,
    universalConfidence01: input.universalCommerce?.meta.universalConfidence01 ?? 0.3,
  });
  const strategyEvolution = evolveBoundedStrategy({ commerceStrategy: input.commerceStrategy });
  const trustAdaptation = modelTrustAdaptation({ trust: input.trust });
  const lifecycleAdaptation = evolveLifecycleAdaptation({
    commerceEvolution: input.commerceEvolution,
    emotionalCommerce: input.emotionalCommerce,
  });
  const regionalAdaptation = evolveRegionalAdaptation({
    query: input.query,
    commerceIdentity: input.commerceIdentity,
  });
  const longTermMemory = evolveLongTermMemory({ memory: input.memory, sessionMemory });
  const patternSynthesis = synthesizeCommercePatterns({
    query: input.query,
    vertical: categoryEvolution.vertical,
    patternStrength: categoryEvolution.evolution01 + heuristicEvolution.delta01,
  });

  void buildReplaySafeEvolutionMemory({
    query: input.query,
    heuristicId: heuristicEvolution.heuristicId,
    calibration01: 0,
  });

  const evolutionGraph = buildDeterministicEvolutionGraph({
    heuristicDelta01: heuristicEvolution.delta01,
    ontologyRefinement01: ontology.refinement01,
    strategyDelta01: strategyEvolution.boundedDelta01,
    trustAdaptation01: trustAdaptation.adaptation01,
  });

  const trust01 = input.trust?.meta.avgTrustScore ?? 0.45;
  const rawAxes: { axisId: EvolutionAxisId; strength01: number }[] = [
    { axisId: "heuristic", strength01: heuristicEvolution.delta01 * 10 },
    { axisId: "ontology", strength01: ontology.refinement01 },
    { axisId: "cognition", strength01: adaptiveCognition.adapt01 * 10 },
    { axisId: "strategy", strength01: strategyEvolution.boundedDelta01 * 10 },
    { axisId: "category", strength01: categoryEvolution.evolution01 * 10 },
    { axisId: "trust", strength01: trustAdaptation.adaptation01 * 10 },
    { axisId: "lifecycle", strength01: lifecycleAdaptation.strength01 * 10 },
    { axisId: "regional", strength01: regionalAdaptation.weight01 * 10 },
    { axisId: "memory", strength01: longTermMemory.memoryEvolution01 * 10 },
    { axisId: "pattern", strength01: patternSynthesis.strength01 },
    { axisId: "temporal", strength01: lifecycleAdaptation.strength01 * 8 },
    { axisId: "calibration", strength01: ctx.driftSignals },
  ];

  const fusedSignals = fuseDeterministicEvolutionSignals(rawAxes, trust01);
  const fusedScore = computeFusedEvolutionScore(fusedSignals);
  void arbitrateEvolutionSignals(fusedSignals);

  const calibration = runAutonomousCalibration({
    fusedScore,
    driftSignals: ctx.driftSignals,
  });

  void buildReplaySafeEvolutionMemory({
    query: input.query,
    heuristicId: heuristicEvolution.heuristicId,
    calibration01: calibration.calibration01,
  });

  const temporalLifecycle = buildTemporalEvolutionLifecycle({
    calibrationBand: calibration.band,
    lifecycleStrength01: lifecycleAdaptation.strength01,
  });

  const evolutionConfidence01 = Math.min(
    1,
    fusedScore * 0.4 +
      trust01 * 0.22 +
      (input.commerceEvolution?.meta.evolutionConfidence01 ?? 0.3) * 0.2 +
      calibration.calibration01 * 0.1 +
      0.05
  );

  const governance = arbitrateEvolutionCognition(input, evolutionConfidence01);
  const shadowCandidates = buildShadowEvolutionCandidates({
    fusedSignals,
    governance,
    maxInfluence01,
  });

  const traceExamples = fusedSignals.map((s) => `${s.axisId}:${s.trustAdjusted01}`);
  const explain = buildEvolutionExplainability({
    heuristicLabel: heuristicEvolution.label,
    ontologyCount: ontology.nodes.length,
    calibrationBand: calibration.band,
    governance,
    fusedCount: fusedSignals.length,
    traceExamples,
  });

  return {
    heuristicEvolution,
    ontologyRefinement: {
      refinedConcepts: ontology.refinedConcepts,
      refinement01: ontology.refinement01,
    },
    adaptiveCognition,
    strategyEvolution,
    categoryEvolution,
    trustAdaptation,
    lifecycleAdaptation,
    regionalAdaptation,
    calibration,
    patternSynthesis,
    evolutionGraph,
    ontologyEvolution: ontology.nodes,
    temporalLifecycle,
    fusedSignals,
    shadowCandidates,
    explain,
    evolutionConfidence01,
    governanceAllowed: governance.allowed,
  };
}

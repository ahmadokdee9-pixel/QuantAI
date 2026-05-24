/**
 * Phase 7 — Authoritative recommendation cognition (shadow-safe).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CanonicalProductNode } from "@/lib/intelligence/identity/types";
import { buildCanonicalProductGraph } from "@/lib/intelligence/identity/canonicalProductGraph";
import {
  EMPTY_COMMERCE_SESSION_MEMORY,
  type CommerceSessionMemoryV1,
} from "@/lib/intelligence/commerceSessionMemory";
import type {
  RecommendationCognitionInput,
  RecommendationCognitionResult,
  RecommendationCognitionMeta,
} from "./types";
import { RECOMMENDATION_COGNITION_VERSION } from "./types";
import { readRecommendationCognitionFlags } from "./flags";
import { runRecommendationCognitionEngine } from "./cognition/recommendationCognitionEngine";
import { buildAutonomousRecommendationGraph } from "./graph/autonomousRecommendationGraph";
import { trackIntentEvolution } from "./intent/intentEvolutionTracker";
import {
  buildShadowRecommendationCandidates,
  computeDiversityStability,
} from "./candidates/shadowRecommendationCandidates";
import { applyRecommendationSafetyGuards } from "./safety/recommendationSafetyGuards";
import { buildRecommendationExplainability } from "./explain/recommendationExplainability";
import { computeBoundedRecommendationState } from "./replay/boundedRecommendationState";
import { buildRecommendationReplayFingerprint } from "./replay/recommendationReplayKernel";
import {
  snapshotRecommendationCognitionOrchestration,
  type RecommendationCognitionOrchestrationContext,
  type RecommendationCognitionOrchestrationSnapshot,
} from "./recommendationCognitionOrchestration";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export type BuildRecommendationCognitionOptions = {
  orchestration?: RecommendationCognitionOrchestrationContext;
  sessionMemory?: CommerceSessionMemoryV1;
};

/**
 * Build recommendation cognition layers. Does NOT mutate product ranking.
 */
export function buildRecommendationCognition(
  input: RecommendationCognitionInput,
  options: BuildRecommendationCognitionOptions = {}
): RecommendationCognitionResult {
  const started = Date.now();
  const flags = readRecommendationCognitionFlags();
  const { products, query } = input;
  const sessionMemory =
    options.sessionMemory ?? input.sessionMemory ?? EMPTY_COMMERCE_SESSION_MEMORY;

  const empty = (): RecommendationCognitionResult => ({
    products,
    meta: {
      version: RECOMMENDATION_COGNITION_VERSION,
      enabled: flags.enabled,
      shadowOnly: true,
      query,
      inputCount: products.length,
      candidateCount: 0,
      graphNodeCount: 0,
      avgConfidence01: 0,
      diversityStability01: 0,
      intentEvolutionScore: 0,
      safetyBlockedCount: 0,
      latencyMs: Date.now() - started,
      graph: { motivationNodes: 0, relatedEdges: 0, trajectorySteps: 0, crossCategoryHints: 0 },
    },
    latentIntent: {
      upgradeIntent01: 0,
      luxuryIntent01: 0,
      valueSeekingIntent01: 0,
      urgency01: 0,
      trustFirst01: 0,
      aestheticDriven01: 0,
      comparisonDriven01: 0,
      impulseShopping01: 0,
      analyticalShopping01: 0,
    },
    intentEvolution: {
      exploration01: 0,
      commitment01: 0,
      shoppingMaturity01: 0,
      funnelNarrowing01: 0,
      confidenceShift01: 0,
      repeatPattern01: 0,
      trajectoryId: "disabled",
    },
    explain: {
      whyRecommended: [],
      whyCrossCategory: [],
      whyBundleSuggested: [],
      whyUpgradeDetected: [],
      whyLuxuryIntentDetected: [],
      whyValueIntentDetected: [],
      whyRecommendationConfidence: [],
    },
    shadowCandidates: [],
    replayFingerprint: "rcp_disabled",
  });

  if (!flags.enabled || products.length === 0) return empty();

  const memoryResult =
    input.memoryResult ?? options.orchestration?.memoryResult ?? null;
  const trustResult = input.trustResult ?? options.orchestration?.trustResult ?? null;

  const canonicalProducts: CanonicalProductNode[] =
    input.canonicalProducts ??
    buildCanonicalProductGraph(
      products,
      options.orchestration?.normalizationMeta?.groups ?? []
    ).nodes;

  const cognition = runRecommendationCognitionEngine({
    query,
    products,
    sessionMemory,
    memoryResult,
    trustResult,
  });

  const categoryAffinity =
    memoryResult?.canonicalTaste.categoryPreferences ?? sessionMemory.categoryAffinity;

  const autoGraph = buildAutonomousRecommendationGraph({
    query,
    products,
    canonicalProducts,
    intent: cognition.latentIntent,
    reasoning: cognition.reasoning,
    sessionMemory,
    categoryAffinity,
  });

  const intentEvolution = trackIntentEvolution({
    query,
    sessionMemory,
    intent: cognition.latentIntent,
    reasoning: cognition.reasoning,
    memoryResult,
  });

  const rawCandidates = buildShadowRecommendationCandidates({
    products,
    intent: cognition.latentIntent,
    reasoning: cognition.reasoning,
    trustResult,
    memoryResult,
  });

  const safety = applyRecommendationSafetyGuards({
    candidates: rawCandidates,
    products,
    trustResult,
  });

  const explain = buildRecommendationExplainability({
    intent: cognition.latentIntent,
    evolution: intentEvolution,
    graph: autoGraph,
    reasoning: cognition.reasoning,
    confidence01: cognition.reasoning.confidence01,
  });

  const bounded = computeBoundedRecommendationState({
    candidateCount: safety.allowed.length,
    graphNodeCount: autoGraph.nodeCount,
  });

  const diversityStability01 = computeDiversityStability(safety.allowed);
  const confidences = safety.allowed.map((c) => c.confidence01);
  const avgConfidence01 =
    confidences.length > 0
      ? round4(confidences.reduce((a, b) => a + b, 0) / confidences.length)
      : 0;

  const meta: RecommendationCognitionMeta = {
    version: RECOMMENDATION_COGNITION_VERSION,
    enabled: true,
    shadowOnly: true,
    query,
    inputCount: products.length,
    candidateCount: safety.allowed.length,
    graphNodeCount: bounded.graphNodeCount,
    avgConfidence01,
    diversityStability01,
    intentEvolutionScore: round4(intentEvolution.shoppingMaturity01),
    safetyBlockedCount: safety.blockedCount,
    latencyMs: Date.now() - started,
    graph: {
      motivationNodes: cognition.motivationGraph.nodes.length,
      relatedEdges: autoGraph.related.edges.length,
      trajectorySteps: autoGraph.trajectory.steps.length,
      crossCategoryHints: autoGraph.expansions.length,
    },
  };

  const result: RecommendationCognitionResult = {
    products,
    meta,
    latentIntent: cognition.latentIntent,
    intentEvolution,
    explain,
    shadowCandidates: safety.allowed,
    replayFingerprint: "",
  };
  result.replayFingerprint = buildRecommendationReplayFingerprint(result);
  return result;
}

export function recommendationCognitionMetaForSearch(
  result: RecommendationCognitionResult,
  orchestration?: RecommendationCognitionOrchestrationSnapshot
): Record<string, unknown> {
  if (!result.meta.enabled) return {};

  const confidenceHistogram = result.shadowCandidates.map((c) => c.confidence01);

  return {
    recommendationCognition: {
      ...result.meta,
      replayFingerprint: result.replayFingerprint,
      orchestration,
      latentIntent: result.latentIntent,
    },
    recommendationCognitionShadow: {
      cognitionTraces: result.explain.whyRecommended.slice(0, 4),
      intentEvolution: result.intentEvolution,
      confidenceHistogram: {
        min: confidenceHistogram.length ? Math.min(...confidenceHistogram) : 0,
        max: confidenceHistogram.length ? Math.max(...confidenceHistogram) : 0,
        avg: result.meta.avgConfidence01,
      },
      diversityStability: result.meta.diversityStability01,
      candidateSample: result.shadowCandidates.slice(0, 5).map((c) => ({
        commerceId: c.commerceId,
        deterministicScore: c.deterministicScore,
        confidence01: c.confidence01,
        rankingMutation: false,
      })),
      explainSample: {
        whyCrossCategory: result.explain.whyCrossCategory.slice(0, 3),
        whyBundleSuggested: result.explain.whyBundleSuggested.slice(0, 3),
        whyLuxuryIntent: result.explain.whyLuxuryIntentDetected.slice(0, 2),
        whyValueIntent: result.explain.whyValueIntentDetected.slice(0, 2),
      },
      safetyBlockedCount: result.meta.safetyBlockedCount,
    },
  };
}

export { snapshotRecommendationCognitionOrchestration };

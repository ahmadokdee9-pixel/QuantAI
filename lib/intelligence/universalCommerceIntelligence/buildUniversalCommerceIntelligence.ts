/**
 * Phase 16 — Universal commerce intelligence (shadow-safe, no ranking mutation).
 */

import type {
  UniversalCommerceIntelligenceInput,
  UniversalCommerceIntelligenceResult,
  UniversalCommerceIntelligenceMeta,
} from "./types";
import { UNIVERSAL_COMMERCE_INTELLIGENCE_VERSION } from "./types";
import { readUniversalCommerceIntelligenceFlags } from "./flags";
import { runUniversalCommerceKernel } from "./kernel/universalCommerceKernel";
import { buildUniversalReplayFingerprint } from "./replay/deterministicUniversalExecution";
import {
  snapshotUniversalOrchestration,
  type UniversalOrchestrationSnapshot,
} from "./orchestrator/universalOrchestration";

/**
 * Build universal commerce intelligence. Does NOT mutate ranking or APPLY.
 */
export function buildUniversalCommerceIntelligence(
  input: UniversalCommerceIntelligenceInput
): UniversalCommerceIntelligenceResult {
  const started = Date.now();
  const flags = readUniversalCommerceIntelligenceFlags();
  const { products, query } = input;

  const empty = (): UniversalCommerceIntelligenceResult => ({
    products,
    meta: {
      version: UNIVERSAL_COMMERCE_INTELLIGENCE_VERSION,
      enabled: flags.enabled,
      shadowOnly: true,
      query,
      inputCount: products.length,
      dominantVertical: "general",
      verticalCount: 0,
      graphNodeCount: 0,
      ontologyNodeCount: 0,
      fusedAxisCount: 0,
      candidateCount: 0,
      universalConfidence01: 0,
      governanceAllowed: false,
      maxInfluence01: 0,
      latencyMs: Date.now() - started,
    },
    categoryCognition: { dominantVertical: "general", spread01: 0 },
    verticalIntelligence: {} as UniversalCommerceIntelligenceResult["verticalIntelligence"],
    premiumUtility: { bias: "balanced", score01: 0 },
    aesthetic: { aesthetic01: 0, label: "utility_first" },
    lifecycle: { phase: "discovery", verticalTiming01: 0 },
    crossCategoryGraph: [],
    ontology: [],
    timingGraph: [],
    fusedSignals: [],
    shadowCandidates: [],
    explain: {
      whyVertical: [],
      whyCrossCategory: [],
      whyAesthetic: [],
      whyTrust: [],
      whyGovernance: ["disabled"],
      whyFusion: [],
      traceExamples: [],
    },
    replayFingerprint: "uci_disabled",
  });

  if (!flags.enabled || products.length === 0) return empty();

  const kernel = runUniversalCommerceKernel(input, flags.maxInfluence01);

  const meta: UniversalCommerceIntelligenceMeta = {
    version: UNIVERSAL_COMMERCE_INTELLIGENCE_VERSION,
    enabled: true,
    shadowOnly: true,
    query,
    inputCount: products.length,
    dominantVertical: kernel.categoryCognition.dominantVertical,
    verticalCount: kernel.verticalCount,
    graphNodeCount: kernel.crossCategoryGraph.length,
    ontologyNodeCount: kernel.ontology.length,
    fusedAxisCount: kernel.fusedSignals.length,
    candidateCount: kernel.shadowCandidates.length,
    universalConfidence01: kernel.universalConfidence01,
    governanceAllowed: kernel.governanceAllowed,
    maxInfluence01: flags.maxInfluence01,
    latencyMs: Date.now() - started,
  };

  const result: UniversalCommerceIntelligenceResult = {
    products,
    meta,
    categoryCognition: kernel.categoryCognition,
    verticalIntelligence: kernel.verticalIntelligence,
    premiumUtility: kernel.premiumUtility,
    aesthetic: kernel.aesthetic,
    lifecycle: kernel.lifecycle,
    crossCategoryGraph: kernel.crossCategoryGraph,
    ontology: kernel.ontology,
    timingGraph: kernel.timingGraph,
    fusedSignals: kernel.fusedSignals,
    shadowCandidates: kernel.shadowCandidates,
    explain: kernel.explain,
    replayFingerprint: "",
  };
  result.replayFingerprint = buildUniversalReplayFingerprint(result);
  return result;
}

export function universalCommerceIntelligenceMetaForSearch(
  result: UniversalCommerceIntelligenceResult,
  orchestration?: UniversalOrchestrationSnapshot
): Record<string, unknown> {
  if (!result.meta.enabled) return {};

  return {
    universalCommerceIntelligence: {
      ...result.meta,
      replayFingerprint: result.replayFingerprint,
      orchestration,
      aestheticLabel: result.aesthetic.label,
      premiumBias: result.premiumUtility.bias,
    },
    universalCommerceIntelligenceShadow: {
      categoryCognition: result.categoryCognition,
      verticalIntelligenceSample: Object.entries(result.verticalIntelligence)
        .filter(([, v]) => v.active)
        .slice(0, 5)
        .map(([id, v]) => ({ verticalId: id, score01: v.score01 })),
      crossCategoryGraphSample: result.crossCategoryGraph.slice(0, 5),
      ontologySample: result.ontology.slice(0, 4),
      timingGraphSample: result.timingGraph.slice(0, 4),
      fusedSignalsSample: result.fusedSignals.slice(0, 6).map((s) => ({
        axisId: s.axisId,
        verticalId: s.verticalId,
        trustAdjusted01: s.trustAdjusted01,
      })),
      explainSample: {
        whyVertical: result.explain.whyVertical,
        whyGovernance: result.explain.whyGovernance.slice(0, 4),
        traceExamples: result.explain.traceExamples,
      },
      shadowCandidates: result.shadowCandidates.slice(0, 4).map((c) => ({
        candidateId: c.candidateId,
        verticalId: c.verticalId,
        rankingMutation: false,
      })),
      governanceReasons: result.meta.governanceAllowed ? [] : result.explain.whyGovernance,
      boundedInfluence: result.meta.maxInfluence01,
    },
  };
}

export { snapshotUniversalOrchestration };

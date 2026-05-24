/**
 * Phase 6 — Authoritative commerce memory + taste intelligence (shadow-safe).
 */

import type { QuantProduct } from "@/lib/shoppingScore";
import type { CanonicalProductNode } from "@/lib/intelligence/identity/types";
import { buildCanonicalProductGraph } from "@/lib/intelligence/identity/canonicalProductGraph";
import {
  EMPTY_COMMERCE_SESSION_MEMORY,
  type CommerceSessionMemoryV1,
} from "@/lib/intelligence/commerceSessionMemory";
import type { CommerceMemoryInput, CommerceMemoryResult, CommerceMemoryMeta } from "./types";
import { MEMORY_ENGINE_VERSION } from "./types";
import { readCommerceMemoryFlags } from "./flags";
import { runTasteProfileEngine } from "./taste/tasteProfileEngine";
import { runCommerceMemoryKernel } from "./memory/commerceMemoryKernel";
import { buildDeterministicPreferenceSignals } from "./signals/deterministicPreferenceSignals";
import { buildMemoryExplainability } from "./explain/memoryExplainability";
import { buildRecommendationPrepGraph } from "./recommendation/recommendationPrepGraph";
import {
  buildMemoryReplayFingerprint,
  verifyBoundedMemoryGrowth,
} from "./replay/deterministicMemoryExecution";
import {
  snapshotMemoryOrchestration,
  type MemoryOrchestrationContext,
  type MemoryOrchestrationSnapshot,
} from "./memoryOrchestration";
import { MAX_MEMORY_GROWTH_BYTES } from "./replay/preferenceReplayContracts";

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export type BuildCommerceMemoryFoundationOptions = {
  orchestration?: MemoryOrchestrationContext;
  sessionMemory?: CommerceSessionMemoryV1;
};

/**
 * Build taste + commerce memory layers. Does NOT mutate product ranking.
 */
export function buildCommerceMemoryFoundation(
  input: CommerceMemoryInput,
  options: BuildCommerceMemoryFoundationOptions = {}
): CommerceMemoryResult {
  const started = Date.now();
  const flags = readCommerceMemoryFlags();
  const { products, query } = input;
  const sessionMemory = options.sessionMemory ?? input.sessionMemory ?? EMPTY_COMMERCE_SESSION_MEMORY;

  const empty = (): CommerceMemoryResult => ({
    products,
    meta: {
      version: MEMORY_ENGINE_VERSION,
      enabled: flags.enabled,
      shadowOnly: true,
      query,
      inputCount: products.length,
      memoryNodeCount: 0,
      tasteProfileConfidence: 0,
      preferenceCoverage: 0,
      avgPreferenceConfidence: 0,
      memoryGrowthBytes: 0,
      latencyMs: Date.now() - started,
      graph: { interactions: 0, tasteNodes: 0, recommendationCandidates: 0 },
    },
    canonicalTaste: {
      aestheticProfile: { minimalist01: 0, luxury01: 0, gamer01: 0, professional01: 0 },
      trustProfile: { trustSensitivity01: 0, merchantSensitivity01: 0 },
      pricingBehavior: { priceSensitivity01: 0, dealSeeking01: 0 },
      categoryPreferences: {},
      qualityExpectations: { qualitySensitivity01: 0 },
      premiumIntent: { premiumPreference01: 0 },
      merchantSensitivity: { preferredStores: [], avoidedRisk01: 0 },
    },
    preferenceSignals: {
      preferenceScore: 0,
      confidence01: 0,
      stability01: 0,
      decayedWeight01: 0,
      rankingMutation: false,
    },
    explain: {
      whyRecommended: [],
      whyPreferenceDetected: [],
      whyBrandAffinity: [],
      whyPriceSensitivity: [],
      whyTrustPreference: [],
    },
    recommendationPrep: [],
    replayFingerprint: "mmp_disabled",
  });

  if (!flags.enabled || products.length === 0) return empty();

  const canonicalProducts: CanonicalProductNode[] =
    input.canonicalProducts ??
    buildCanonicalProductGraph(
      products,
      options.orchestration?.normalizationMeta?.groups ?? []
    ).nodes;

  const trustResult = input.trustResult ?? options.orchestration?.trustResult ?? null;

  const taste = runTasteProfileEngine({
    query,
    products,
    sessionMemory,
    trustResult,
  });
  const memory = runCommerceMemoryKernel({
    query,
    products,
    sessionMemory,
    trustResult,
  });
  const preferenceSignals = buildDeterministicPreferenceSignals({
    taste,
    memory,
    sessionMemory,
  });
  const explain = buildMemoryExplainability({
    taste,
    memory,
    preferenceSignals,
    canonicalTaste: taste.canonicalTaste,
  });
  const recommendationPrep = buildRecommendationPrepGraph({
    canonicalProducts,
    products,
    canonicalTaste: taste.canonicalTaste,
  });

  const memoryGrowthBytes = Math.min(MAX_MEMORY_GROWTH_BYTES, memory.memoryGrowthEstimate);
  verifyBoundedMemoryGrowth(memoryGrowthBytes);

  const meta: CommerceMemoryMeta = {
    version: MEMORY_ENGINE_VERSION,
    enabled: true,
    shadowOnly: true,
    query,
    inputCount: products.length,
    memoryNodeCount: memory.interactionGraph.nodeCount,
    tasteProfileConfidence: taste.confidence01,
    preferenceCoverage: products.length > 0 ? round4(recommendationPrep.length / products.length) : 0,
    avgPreferenceConfidence: preferenceSignals.confidence01,
    memoryGrowthBytes,
    latencyMs: Date.now() - started,
    graph: {
      interactions: memory.interactionGraph.nodeCount,
      tasteNodes: taste.aestheticGraph.nodes.length,
      recommendationCandidates: recommendationPrep.length,
    },
  };

  const result: CommerceMemoryResult = {
    products,
    meta,
    canonicalTaste: taste.canonicalTaste,
    preferenceSignals,
    explain,
    recommendationPrep,
    replayFingerprint: "",
  };
  result.replayFingerprint = buildMemoryReplayFingerprint(result);
  return result;
}

export function commerceMemoryMetaForSearch(
  result: CommerceMemoryResult,
  orchestration?: MemoryOrchestrationSnapshot
): Record<string, unknown> {
  if (!result.meta.enabled) return {};

  return {
    commerceMemory: {
      ...result.meta,
      replayFingerprint: result.replayFingerprint,
      orchestration,
      preferenceSignals: result.preferenceSignals,
    },
    commerceMemoryShadow: {
      tasteCluster: {
        dominantAxis:
          result.canonicalTaste.aestheticProfile.luxury01 >=
          result.canonicalTaste.aestheticProfile.minimalist01
            ? "luxury"
            : "minimalist",
        confidence: result.meta.tasteProfileConfidence,
      },
      preferenceConfidence: {
        min: result.preferenceSignals.confidence01,
        max: result.preferenceSignals.confidence01,
        avg: result.meta.avgPreferenceConfidence,
        stability: result.preferenceSignals.stability01,
      },
      explainSample: {
        whyRecommended: result.explain.whyRecommended.slice(0, 4),
        whyPreferenceDetected: result.explain.whyPreferenceDetected.slice(0, 4),
        whyBrandAffinity: result.explain.whyBrandAffinity.slice(0, 4),
      },
      recommendationPrepSample: result.recommendationPrep.slice(0, 4).map((n) => ({
        commerceId: n.commerceId,
        candidateCount: n.candidateLinks.length,
        similarityPrepScore: n.similarityPrepScore,
        rankingMutation: false,
      })),
      memoryGrowthBytes: result.meta.memoryGrowthBytes,
      profileTrace: {
        premiumIntent: result.canonicalTaste.premiumIntent.premiumPreference01,
        priceSensitivity: result.canonicalTaste.pricingBehavior.priceSensitivity01,
        trustSensitivity: result.canonicalTaste.trustProfile.trustSensitivity01,
      },
    },
  };
}

export { snapshotMemoryOrchestration };

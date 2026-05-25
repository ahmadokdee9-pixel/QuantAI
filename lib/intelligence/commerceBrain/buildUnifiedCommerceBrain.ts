/**
 * Phase 11 — Unified commerce brain (shadow-safe, no ranking mutation).
 */

import type { CommerceBrainInput, CommerceBrainResult, CommerceBrainMeta } from "./types";
import { COMMERCE_BRAIN_VERSION } from "./types";
import { readCommerceBrainFlags } from "./flags";
import { runUnifiedReasoningKernel } from "./kernel/unifiedReasoningKernel";
import { buildBrainReplayFingerprint } from "./replay/deterministicBrainExecution";
import {
  snapshotBrainOrchestration,
  type BrainOrchestrationSnapshot,
} from "./orchestrator/boundedCommerceBrainOrchestration";

/**
 * Fuse Phases 4–10 intelligence into unified brain output. Does NOT mutate ranking.
 */
export function buildUnifiedCommerceBrain(input: CommerceBrainInput): CommerceBrainResult {
  const started = Date.now();
  const flags = readCommerceBrainFlags();
  const { products, query } = input;

  const empty = (): CommerceBrainResult => ({
    products,
    meta: {
      version: COMMERCE_BRAIN_VERSION,
      enabled: flags.enabled,
      shadowOnly: true,
      query,
      inputCount: products.length,
      fusedSignalCount: 0,
      decisionNodeCount: 0,
      brainConfidence01: 0,
      governanceAllowed: false,
      maxInfluence01: 0,
      latencyMs: Date.now() - started,
    },
    fusedSignals: [],
    arbitration: {
      primaryLayer: "trust",
      secondaryLayer: "identity",
      arbitrationScore01: 0,
      rankingMutation: false,
    },
    decisionGraph: [],
    synthesis: {
      synthesisId: "syn_disabled",
      confidence01: 0,
      maxInfluence01: 0,
      candidateLinks: [],
      rankingMutation: false,
    },
    explain: {
      whyPrimaryLayer: [],
      whyArbitration: [],
      whyFusion: [],
      whyTrustWeight: [],
      whyTasteWeight: [],
      whyTemporalWeight: [],
      whySynthesis: [],
      layerTraces: [],
    },
    replayFingerprint: "brn_disabled",
  });

  if (!flags.enabled || products.length === 0) return empty();

  const kernel = runUnifiedReasoningKernel(input, flags.maxInfluence01);

  const meta: CommerceBrainMeta = {
    version: COMMERCE_BRAIN_VERSION,
    enabled: true,
    shadowOnly: true,
    query,
    inputCount: products.length,
    fusedSignalCount: kernel.fusedSignals.length,
    decisionNodeCount: kernel.decisionGraph.length,
    brainConfidence01: kernel.brainConfidence01,
    governanceAllowed: kernel.governance.allowed,
    maxInfluence01: kernel.synthesis.maxInfluence01,
    latencyMs: Date.now() - started,
  };

  const result: CommerceBrainResult = {
    products,
    meta,
    fusedSignals: kernel.fusedSignals,
    arbitration: kernel.arbitration,
    decisionGraph: kernel.decisionGraph,
    synthesis: kernel.synthesis,
    explain: kernel.explain,
    replayFingerprint: "",
  };
  result.replayFingerprint = buildBrainReplayFingerprint(result);
  return result;
}

export function commerceBrainMetaForSearch(
  result: CommerceBrainResult,
  orchestration?: BrainOrchestrationSnapshot
): Record<string, unknown> {
  if (!result.meta.enabled) return {};

  return {
    commerceBrain: {
      ...result.meta,
      replayFingerprint: result.replayFingerprint,
      orchestration,
      arbitration: result.arbitration,
      synthesis: {
        synthesisId: result.synthesis.synthesisId,
        confidence01: result.synthesis.confidence01,
        maxInfluence01: result.synthesis.maxInfluence01,
        rankingMutation: false,
      },
    },
    commerceBrainShadow: {
      fusedSignalSample: result.fusedSignals.slice(0, 6).map((s) => ({
        layer: s.layer,
        signalId: s.signalId,
        weight01: s.weight01,
      })),
      decisionGraphSample: result.decisionGraph.slice(0, 5).map((n) => ({
        nodeId: n.nodeId,
        layer: n.layer,
        priority: n.priority,
      })),
      explainTraces: {
        whyPrimaryLayer: result.explain.whyPrimaryLayer,
        whyFusion: result.explain.whyFusion,
        whySynthesis: result.explain.whySynthesis,
        layerTraces: result.explain.layerTraces.slice(0, 6),
      },
      governanceReasons: result.meta.governanceAllowed ? [] : ["brain_governance_blocked"],
      boundedInfluence: result.synthesis.maxInfluence01,
    },
  };
}

export { snapshotBrainOrchestration };

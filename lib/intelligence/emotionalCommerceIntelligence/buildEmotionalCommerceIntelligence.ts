/**
 * Phase 17 — Emotional commerce intelligence (shadow-safe, no ranking mutation).
 */

import type {
  EmotionalCommerceIntelligenceInput,
  EmotionalCommerceIntelligenceResult,
  EmotionalCommerceIntelligenceMeta,
} from "./types";
import { EMOTIONAL_COMMERCE_INTELLIGENCE_VERSION } from "./types";
import { readEmotionalCommerceIntelligenceFlags } from "./flags";
import { runEmotionalCommerceKernel } from "./kernel/emotionalCommerceKernel";
import { buildEmotionalReplayFingerprint } from "./replay/deterministicEmotionalExecution";
import {
  snapshotEmotionalOrchestration,
  type EmotionalOrchestrationSnapshot,
} from "./orchestrator/emotionalOrchestration";

/**
 * Build emotional commerce intelligence. Does NOT mutate ranking or APPLY.
 */
export function buildEmotionalCommerceIntelligence(
  input: EmotionalCommerceIntelligenceInput
): EmotionalCommerceIntelligenceResult {
  const started = Date.now();
  const flags = readEmotionalCommerceIntelligenceFlags();
  const { products, query } = input;

  const empty = (): EmotionalCommerceIntelligenceResult => ({
    products,
    meta: {
      version: EMOTIONAL_COMMERCE_INTELLIGENCE_VERSION,
      enabled: flags.enabled,
      shadowOnly: true,
      query,
      inputCount: products.length,
      emotionalGraphCount: 0,
      tasteNodeCount: 0,
      fusedAxisCount: 0,
      candidateCount: 0,
      emotionalConfidence01: 0,
      stylePersonality: "unknown",
      governanceAllowed: false,
      maxInfluence01: 0,
      latencyMs: Date.now() - started,
    },
    aestheticIdentity: { minimalist01: 0, maximalist01: 0, label: "unknown" },
    lifestyle: { lifestyleLabel: "general_lifestyle", alignment01: 0 },
    premiumAttraction: { attraction01: 0, label: "neutral_draw" },
    luxuryPsychology: { aspiration01: 0, status01: 0 },
    purchaseDrivers: { driver: "exploratory", strength01: 0 },
    impulseRational: { impulse01: 0, rational01: 0, balance: "balanced_decision" },
    stylePersonality: { personality: "unknown", confidence01: 0 },
    emotionalTrust: { score01: 0, label: "low_emotional_trust" },
    confidenceAspiration: { confidence01: 0, aspiration01: 0 },
    comfortStatusUtility: { comfort01: 0, status01: 0, utility01: 0 },
    emotionalTiming: { timingLabel: "exploratory_browse", urgency01: 0 },
    emotionalLifecycle: { phase: "discovery", continuity01: 0 },
    emotionalGraph: [],
    tasteCognitionGraph: [],
    lifecycleGraph: [],
    fusedSignals: [],
    shadowCandidates: [],
    explain: {
      whyEmotional: [],
      whyAesthetic: [],
      whyLifestyle: [],
      whyPremium: [],
      whyGovernance: ["disabled"],
      whyFusion: [],
      traceExamples: [],
    },
    replayFingerprint: "eci_disabled",
  });

  if (!flags.enabled || products.length === 0) return empty();

  const kernel = runEmotionalCommerceKernel(input, flags.maxInfluence01);

  const meta: EmotionalCommerceIntelligenceMeta = {
    version: EMOTIONAL_COMMERCE_INTELLIGENCE_VERSION,
    enabled: true,
    shadowOnly: true,
    query,
    inputCount: products.length,
    emotionalGraphCount: kernel.emotionalGraph.length,
    tasteNodeCount: kernel.tasteCognitionGraph.length,
    fusedAxisCount: kernel.fusedSignals.length,
    candidateCount: kernel.shadowCandidates.length,
    emotionalConfidence01: kernel.emotionalConfidence01,
    stylePersonality: kernel.stylePersonality.personality,
    governanceAllowed: kernel.governanceAllowed,
    maxInfluence01: flags.maxInfluence01,
    latencyMs: Date.now() - started,
  };

  const result: EmotionalCommerceIntelligenceResult = {
    products,
    meta,
    aestheticIdentity: kernel.aestheticIdentity,
    lifestyle: kernel.lifestyle,
    premiumAttraction: kernel.premiumAttraction,
    luxuryPsychology: kernel.luxuryPsychology,
    purchaseDrivers: kernel.purchaseDrivers,
    impulseRational: kernel.impulseRational,
    stylePersonality: kernel.stylePersonality,
    emotionalTrust: kernel.emotionalTrust,
    confidenceAspiration: kernel.confidenceAspiration,
    comfortStatusUtility: kernel.comfortStatusUtility,
    emotionalTiming: kernel.emotionalTiming,
    emotionalLifecycle: kernel.emotionalLifecycle,
    emotionalGraph: kernel.emotionalGraph,
    tasteCognitionGraph: kernel.tasteCognitionGraph,
    lifecycleGraph: kernel.lifecycleGraph,
    fusedSignals: kernel.fusedSignals,
    shadowCandidates: kernel.shadowCandidates,
    explain: kernel.explain,
    replayFingerprint: "",
  };
  result.replayFingerprint = buildEmotionalReplayFingerprint(result);
  return result;
}

export function emotionalCommerceIntelligenceMetaForSearch(
  result: EmotionalCommerceIntelligenceResult,
  orchestration?: EmotionalOrchestrationSnapshot
): Record<string, unknown> {
  if (!result.meta.enabled) return {};

  return {
    emotionalCommerceIntelligence: {
      ...result.meta,
      replayFingerprint: result.replayFingerprint,
      orchestration,
      aestheticLabel: result.aestheticIdentity.label,
      premiumLabel: result.premiumAttraction.label,
      emotionalDriver: result.purchaseDrivers.driver,
    },
    emotionalCommerceIntelligenceShadow: {
      aestheticIdentity: result.aestheticIdentity,
      lifestyle: result.lifestyle,
      impulseRational: result.impulseRational,
      emotionalGraphSample: result.emotionalGraph.slice(0, 5),
      tasteCognitionSample: result.tasteCognitionGraph.slice(0, 4),
      lifecycleGraphSample: result.lifecycleGraph.slice(0, 3),
      fusedSignalsSample: result.fusedSignals.slice(0, 6).map((s) => ({
        axisId: s.axisId,
        trustAdjusted01: s.trustAdjusted01,
      })),
      explainSample: {
        whyEmotional: result.explain.whyEmotional,
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

export { snapshotEmotionalOrchestration };

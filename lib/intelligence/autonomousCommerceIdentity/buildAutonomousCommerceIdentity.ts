/**
 * Phase 13 — Autonomous commerce identity (shadow-safe, no ranking mutation).
 */

import type {
  AutonomousCommerceIdentityInput,
  AutonomousCommerceIdentityResult,
  AutonomousCommerceIdentityMeta,
} from "./types";
import { AUTONOMOUS_COMMERCE_IDENTITY_VERSION } from "./types";
import { readAutonomousCommerceIdentityFlags } from "./flags";
import {
  runIdentityOrchestrationKernel,
  EMPTY_COMMERCE_SESSION_MEMORY,
} from "./kernel/identityOrchestrationKernel";
import { buildIdentityReplayFingerprint } from "./replay/deterministicIdentityExecution";
import {
  snapshotCommerceIdentityOrchestration,
  type CommerceIdentityOrchestrationSnapshot,
} from "./orchestrator/commerceIdentityOrchestration";

export type BuildAutonomousCommerceIdentityOptions = {
  sessionMemory?: import("@/lib/intelligence/commerceSessionMemory").CommerceSessionMemoryV1;
};

/**
 * Build persistent commerce identity intelligence. Does NOT mutate ranking or APPLY.
 */
export function buildAutonomousCommerceIdentity(
  input: AutonomousCommerceIdentityInput,
  options: BuildAutonomousCommerceIdentityOptions = {}
): AutonomousCommerceIdentityResult {
  const started = Date.now();
  const flags = readAutonomousCommerceIdentityFlags();
  const { products, query } = input;
  const sessionMemory = options.sessionMemory ?? input.sessionMemory ?? EMPTY_COMMERCE_SESSION_MEMORY;

  const empty = (): AutonomousCommerceIdentityResult => ({
    products,
    meta: {
      version: AUTONOMOUS_COMMERCE_IDENTITY_VERSION,
      enabled: flags.enabled,
      shadowOnly: true,
      query,
      inputCount: products.length,
      graphNodeCount: 0,
      personaNodeCount: 0,
      fusedAxisCount: 0,
      candidateCount: 0,
      identityConfidence01: 0,
      governanceAllowed: false,
      maxInfluence01: 0,
      driftBand: "stable",
      latencyMs: Date.now() - started,
    },
    tasteFingerprint: { fingerprintId: "taste_disabled", premium01: 0, value01: 0, aesthetic01: 0 },
    categoryAffinity: { dominantCategory: "general", evolution01: 0 },
    luxuryModel: { band: "balanced", score01: 0 },
    crossSessionPersonality: { personaId: "balanced_shopper", stability01: 0 },
    lifecycleTransition: { fromPhase: "neutral", toPhase: "discovery", strength01: 0 },
    maturity: { maturity01: 0, label: "nascent" },
    preferenceContinuity: { continuity01: 0, decay01: 1 },
    intentPersistence: { intentLabel: "neutral", persistence01: 0 },
    regionalCalibration: { regionLabel: "global", calibration01: 0 },
    seasonalAdaptation: { adaptation01: 0, seasonLabel: "off_season" },
    fusedSignals: [],
    personaGraph: [],
    identityGraph: [],
    snapshots: [],
    shadowCandidates: [],
    explain: {
      whyPersona: [],
      whyTaste: [],
      whyCategory: [],
      whyMaturity: [],
      whyDrift: [],
      whyGovernance: ["disabled"],
      whyFusion: [],
      traceExamples: [],
    },
    replayFingerprint: "aci_disabled",
  });

  if (!flags.enabled || products.length === 0) return empty();

  const kernel = runIdentityOrchestrationKernel(input, sessionMemory, flags.maxInfluence01);

  const meta: AutonomousCommerceIdentityMeta = {
    version: AUTONOMOUS_COMMERCE_IDENTITY_VERSION,
    enabled: true,
    shadowOnly: true,
    query,
    inputCount: products.length,
    graphNodeCount: kernel.identityGraph.length,
    personaNodeCount: kernel.personaGraph.length,
    fusedAxisCount: kernel.fusedSignals.length,
    candidateCount: kernel.shadowCandidates.length,
    identityConfidence01: kernel.identityConfidence01,
    governanceAllowed: kernel.governanceAllowed,
    maxInfluence01: flags.maxInfluence01,
    driftBand: kernel.driftBand,
    latencyMs: Date.now() - started,
  };

  const result: AutonomousCommerceIdentityResult = {
    products,
    meta,
    tasteFingerprint: kernel.tasteFingerprint,
    categoryAffinity: kernel.categoryAffinity,
    luxuryModel: kernel.luxuryModel,
    crossSessionPersonality: kernel.crossSessionPersonality,
    lifecycleTransition: kernel.lifecycleTransition,
    maturity: kernel.maturity,
    preferenceContinuity: kernel.preferenceContinuity,
    intentPersistence: kernel.intentPersistence,
    regionalCalibration: kernel.regionalCalibration,
    seasonalAdaptation: kernel.seasonalAdaptation,
    fusedSignals: kernel.fusedSignals,
    personaGraph: kernel.personaGraph,
    identityGraph: kernel.identityGraph,
    snapshots: kernel.snapshots,
    shadowCandidates: kernel.shadowCandidates,
    explain: kernel.explain,
    replayFingerprint: "",
  };
  result.replayFingerprint = buildIdentityReplayFingerprint(result);
  return result;
}

export function autonomousCommerceIdentityMetaForSearch(
  result: AutonomousCommerceIdentityResult,
  orchestration?: CommerceIdentityOrchestrationSnapshot
): Record<string, unknown> {
  if (!result.meta.enabled) return {};

  return {
    autonomousCommerceIdentity: {
      ...result.meta,
      replayFingerprint: result.replayFingerprint,
      orchestration,
      personaId: result.crossSessionPersonality.personaId,
      luxuryBand: result.luxuryModel.band,
      maturityLabel: result.maturity.label,
    },
    autonomousCommerceIdentityShadow: {
      tasteFingerprint: result.tasteFingerprint,
      categoryAffinity: result.categoryAffinity,
      luxuryModel: result.luxuryModel,
      lifecycleTransition: result.lifecycleTransition,
      intentPersistence: result.intentPersistence,
      fusedSignalsSample: result.fusedSignals.slice(0, 6).map((s) => ({
        axisId: s.axisId,
        trustAdjusted01: s.trustAdjusted01,
        weight01: s.weight01,
      })),
      personaGraphSample: result.personaGraph.slice(0, 4),
      identityGraphSample: result.identityGraph.slice(0, 5),
      explainSample: {
        whyPersona: result.explain.whyPersona.slice(0, 3),
        whyGovernance: result.explain.whyGovernance.slice(0, 4),
        traceExamples: result.explain.traceExamples,
      },
      shadowCandidates: result.shadowCandidates.slice(0, 4).map((c) => ({
        candidateId: c.candidateId,
        axisId: c.axisId,
        confidence01: c.confidence01,
        rankingMutation: false,
      })),
      governanceReasons: result.meta.governanceAllowed ? [] : result.explain.whyGovernance,
      boundedInfluence: result.meta.maxInfluence01,
    },
  };
}

export { snapshotCommerceIdentityOrchestration };

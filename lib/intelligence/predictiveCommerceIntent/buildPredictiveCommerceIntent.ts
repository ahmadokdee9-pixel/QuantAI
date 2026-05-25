/**
 * Phase 14 — Predictive commerce intent (shadow-safe, no ranking mutation).
 */

import type {
  PredictiveCommerceIntentInput,
  PredictiveCommerceIntentResult,
  PredictiveCommerceIntentMeta,
} from "./types";
import { PREDICTIVE_COMMERCE_INTENT_VERSION } from "./types";
import { readPredictiveCommerceIntentFlags } from "./flags";
import {
  runPredictiveIntentKernel,
  EMPTY_COMMERCE_SESSION_MEMORY,
} from "./kernel/predictiveIntentKernel";
import { buildPredictionReplayFingerprint } from "./replay/deterministicPredictionExecution";
import {
  snapshotPredictiveIntentOrchestration,
  type PredictiveIntentOrchestrationSnapshot,
} from "./orchestrator/predictiveIntentOrchestration";

export type BuildPredictiveCommerceIntentOptions = {
  sessionMemory?: import("@/lib/intelligence/commerceSessionMemory").CommerceSessionMemoryV1;
};

/**
 * Build predictive commerce intent layer. Does NOT mutate ranking or APPLY.
 */
export function buildPredictiveCommerceIntent(
  input: PredictiveCommerceIntentInput,
  options: BuildPredictiveCommerceIntentOptions = {}
): PredictiveCommerceIntentResult {
  const started = Date.now();
  const flags = readPredictiveCommerceIntentFlags();
  const { products, query } = input;
  const sessionMemory = options.sessionMemory ?? input.sessionMemory ?? EMPTY_COMMERCE_SESSION_MEMORY;

  const empty = (): PredictiveCommerceIntentResult => ({
    products,
    meta: {
      version: PREDICTIVE_COMMERCE_INTENT_VERSION,
      enabled: flags.enabled,
      shadowOnly: true,
      query,
      inputCount: products.length,
      graphNodeCount: 0,
      futureNodeCount: 0,
      fusedAxisCount: 0,
      candidateCount: 0,
      predictionConfidence01: 0,
      readiness01: 0,
      purchaseProbability01: 0,
      governanceAllowed: false,
      maxInfluence01: 0,
      latencyMs: Date.now() - started,
    },
    readiness: { readiness01: 0, label: "exploratory" },
    purchaseProbability: { probability01: 0, horizon: "distant" },
    replacementCycle: { cycle01: 0, windowLabel: "replacement_distant" },
    upgradeTiming: { timing01: 0, label: "no_upgrade_signal" },
    urgency: { urgency01: 0, tier: "low" },
    momentum: { momentum01: 0, acceleration01: 0 },
    demandAcceleration: { accel01: 0, direction: "stable" },
    temporalBuying: { horizon: "distant", score01: 0 },
    lifecycleForecast: { phase: "discovery", forecast01: 0 },
    seasonalForecast: { seasonLabel: "off_season", forecast01: 0 },
    regionalWeight: { regionLabel: "global", weight01: 0 },
    trendAlignment: { alignment01: 0, trendLabel: "neutral" },
    futureState: { stateLabel: "low_intent_future", confidence01: 0 },
    fusedSignals: [],
    intentGraph: [],
    futureGraph: [],
    shadowCandidates: [],
    explain: {
      whyReadiness: [],
      whyPurchase: [],
      whyTiming: [],
      whyUrgency: [],
      whyGovernance: ["disabled"],
      whyFusion: [],
      traceExamples: [],
    },
    replayFingerprint: "pci_disabled",
  });

  if (!flags.enabled || products.length === 0) return empty();

  const kernel = runPredictiveIntentKernel(input, sessionMemory, flags.maxInfluence01);

  const meta: PredictiveCommerceIntentMeta = {
    version: PREDICTIVE_COMMERCE_INTENT_VERSION,
    enabled: true,
    shadowOnly: true,
    query,
    inputCount: products.length,
    graphNodeCount: kernel.intentGraph.length,
    futureNodeCount: kernel.futureGraph.length,
    fusedAxisCount: kernel.fusedSignals.length,
    candidateCount: kernel.shadowCandidates.length,
    predictionConfidence01: kernel.predictionConfidence01,
    readiness01: kernel.readiness.readiness01,
    purchaseProbability01: kernel.purchaseProbability.probability01,
    governanceAllowed: kernel.governanceAllowed,
    maxInfluence01: flags.maxInfluence01,
    latencyMs: Date.now() - started,
  };

  const result: PredictiveCommerceIntentResult = {
    products,
    meta,
    readiness: kernel.readiness,
    purchaseProbability: kernel.purchaseProbability,
    replacementCycle: kernel.replacementCycle,
    upgradeTiming: kernel.upgradeTiming,
    urgency: kernel.urgency,
    momentum: kernel.momentum,
    demandAcceleration: kernel.demandAcceleration,
    temporalBuying: kernel.temporalBuying,
    lifecycleForecast: kernel.lifecycleForecast,
    seasonalForecast: kernel.seasonalForecast,
    regionalWeight: kernel.regionalWeight,
    trendAlignment: kernel.trendAlignment,
    futureState: kernel.futureState,
    fusedSignals: kernel.fusedSignals,
    intentGraph: kernel.intentGraph,
    futureGraph: kernel.futureGraph,
    shadowCandidates: kernel.shadowCandidates,
    explain: kernel.explain,
    replayFingerprint: "",
  };
  result.replayFingerprint = buildPredictionReplayFingerprint(result);
  return result;
}

export function predictiveCommerceIntentMetaForSearch(
  result: PredictiveCommerceIntentResult,
  orchestration?: PredictiveIntentOrchestrationSnapshot
): Record<string, unknown> {
  if (!result.meta.enabled) return {};

  return {
    predictiveCommerceIntent: {
      ...result.meta,
      replayFingerprint: result.replayFingerprint,
      orchestration,
      readinessLabel: result.readiness.label,
      futureStateLabel: result.futureState.stateLabel,
    },
    predictiveCommerceIntentShadow: {
      readiness: result.readiness,
      purchaseProbability: result.purchaseProbability,
      upgradeTiming: result.upgradeTiming,
      temporalBuying: result.temporalBuying,
      futureState: result.futureState,
      fusedSignalsSample: result.fusedSignals.slice(0, 6).map((s) => ({
        axisId: s.axisId,
        trustAdjusted01: s.trustAdjusted01,
      })),
      futureGraphSample: result.futureGraph.slice(0, 4),
      explainSample: {
        whyReadiness: result.explain.whyReadiness,
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

export { snapshotPredictiveIntentOrchestration };

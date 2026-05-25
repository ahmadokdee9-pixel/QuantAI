/**
 * Phase 12 — Live adaptive commerce signals (shadow-safe, no ranking mutation).
 */

import type {
  LiveCommerceSignalsInput,
  LiveCommerceSignalsResult,
  LiveCommerceSignalsMeta,
} from "./types";
import { LIVE_COMMERCE_SIGNALS_VERSION } from "./types";
import { readLiveCommerceSignalsFlags } from "./flags";
import { runBoundedLiveSignalEngine } from "./engine/boundedLiveSignalEngine";
import { buildLiveSignalReplayFingerprint } from "./replay/deterministicLiveSignalExecution";
import {
  snapshotLiveSignalOrchestration,
  type LiveSignalOrchestrationSnapshot,
} from "./orchestrator/liveSignalOrchestration";

/**
 * Build live adaptive commerce signals. Does NOT mutate product ranking or APPLY.
 */
export function buildLiveAdaptiveCommerceSignals(
  input: LiveCommerceSignalsInput
): LiveCommerceSignalsResult {
  const started = Date.now();
  const flags = readLiveCommerceSignalsFlags();
  const { products, query } = input;

  const empty = (): LiveCommerceSignalsResult => ({
    products,
    meta: {
      version: LIVE_COMMERCE_SIGNALS_VERSION,
      enabled: flags.enabled,
      shadowOnly: true,
      query,
      inputCount: products.length,
      fusedSignalCount: 0,
      timingNodeCount: 0,
      candidateCount: 0,
      signalConfidence01: 0,
      governanceAllowed: false,
      maxInfluence01: 0,
      volatilityBand: "low",
      latencyMs: Date.now() - started,
    },
    marketInterpretation: { liveMarketScore01: 0, movementLabel: "stable" },
    momentum: { momentum01: 0, acceleration01: 0 },
    regional: { regionalPressure01: 0, regionLabel: "global" },
    categoryPressure: { pressure01: 0, dominantCategory: "general" },
    macroTiming: { macroScore01: 0, timingLabel: "off_peak" },
    demandShift: { shift01: 0, direction: "stable" },
    pricingClimate: { climate: "neutral", evolution01: 0 },
    merchantEcosystem: { movement01: 0, storeDiversity01: 0 },
    lifecycleWave: { wave01: 0, phase: "discovery" },
    seasonal: { acceleration01: 0, deceleration01: 0 },
    volatility: { volatility01: 0, band: "low" },
    fusedSignals: [],
    timingGraph: [],
    forecast: { horizon: "blocked", forecast01: 0, bounded: true },
    influenceGraph: { edges: [] },
    shadowCandidates: [],
    explain: {
      whyMarketMovement: [],
      whyMomentum: [],
      whyRegional: [],
      whyDemandShift: [],
      whyVolatility: [],
      whyGovernance: ["disabled"],
      whyFusion: [],
    },
    replayFingerprint: "lcs_disabled",
  });

  if (!flags.enabled || products.length === 0) return empty();

  const engine = runBoundedLiveSignalEngine(input, flags.maxInfluence01);

  const meta: LiveCommerceSignalsMeta = {
    version: LIVE_COMMERCE_SIGNALS_VERSION,
    enabled: true,
    shadowOnly: true,
    query,
    inputCount: products.length,
    fusedSignalCount: engine.fusedSignals.length,
    timingNodeCount: engine.timingGraph.length,
    candidateCount: engine.shadowCandidates.length,
    signalConfidence01: engine.signalConfidence01,
    governanceAllowed: engine.governanceAllowed,
    maxInfluence01: flags.maxInfluence01,
    volatilityBand: engine.volatilityBand,
    latencyMs: Date.now() - started,
  };

  const result: LiveCommerceSignalsResult = {
    products,
    meta,
    marketInterpretation: engine.marketInterpretation,
    momentum: engine.momentum,
    regional: engine.regional,
    categoryPressure: engine.categoryPressure,
    macroTiming: engine.macroTiming,
    demandShift: engine.demandShift,
    pricingClimate: engine.pricingClimate,
    merchantEcosystem: engine.merchantEcosystem,
    lifecycleWave: engine.lifecycleWave,
    seasonal: engine.seasonal,
    volatility: engine.volatility,
    fusedSignals: engine.fusedSignals,
    timingGraph: engine.timingGraph,
    forecast: engine.forecast,
    influenceGraph: engine.influenceGraph,
    shadowCandidates: engine.shadowCandidates,
    explain: engine.explain,
    replayFingerprint: "",
  };
  result.replayFingerprint = buildLiveSignalReplayFingerprint(result);
  return result;
}

export function liveCommerceSignalsMetaForSearch(
  result: LiveCommerceSignalsResult,
  orchestration?: LiveSignalOrchestrationSnapshot
): Record<string, unknown> {
  if (!result.meta.enabled) return {};

  return {
    liveCommerceSignals: {
      ...result.meta,
      replayFingerprint: result.replayFingerprint,
      orchestration,
      movementLabel: result.marketInterpretation.movementLabel,
      macroTimingLabel: result.macroTiming.timingLabel,
    },
    liveCommerceSignalsShadow: {
      marketInterpretation: result.marketInterpretation,
      momentum: result.momentum,
      regional: result.regional,
      demandShift: result.demandShift,
      volatility: result.volatility,
      fusedSignalsSample: result.fusedSignals.slice(0, 6).map((s) => ({
        signalId: s.signalId,
        trustAdjusted01: s.trustAdjusted01,
        weight01: s.weight01,
      })),
      timingGraphSample: result.timingGraph.slice(0, 4),
      influenceEdges: result.influenceGraph.edges.slice(0, 6),
      forecast: result.forecast,
      explainSample: {
        whyMarketMovement: result.explain.whyMarketMovement.slice(0, 3),
        whyGovernance: result.explain.whyGovernance.slice(0, 4),
        whyFusion: result.explain.whyFusion.slice(0, 3),
      },
      shadowCandidates: result.shadowCandidates.slice(0, 4).map((c) => ({
        candidateId: c.candidateId,
        signalId: c.signalId,
        confidence01: c.confidence01,
        rankingMutation: false,
      })),
      governanceReasons: result.meta.governanceAllowed ? [] : result.explain.whyGovernance,
      boundedInfluence: result.meta.maxInfluence01,
    },
  };
}

export { snapshotLiveSignalOrchestration };

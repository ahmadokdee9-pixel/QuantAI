/**
 * Phase 15 — Autonomous commerce strategy (shadow-safe, no ranking mutation).
 */

import type {
  AutonomousCommerceStrategyInput,
  AutonomousCommerceStrategyResult,
  AutonomousCommerceStrategyMeta,
} from "./types";
import { AUTONOMOUS_COMMERCE_STRATEGY_VERSION } from "./types";
import { readAutonomousCommerceStrategyFlags } from "./flags";
import {
  runAutonomousStrategyKernel,
  EMPTY_COMMERCE_SESSION_MEMORY,
} from "./kernel/autonomousStrategyKernel";
import { buildStrategyReplayFingerprint } from "./replay/deterministicStrategyExecution";
import {
  snapshotStrategyOrchestration,
  type StrategyOrchestrationSnapshot,
} from "./orchestrator/strategyOrchestration";

export type BuildAutonomousCommerceStrategyOptions = {
  sessionMemory?: import("@/lib/intelligence/commerceSessionMemory").CommerceSessionMemoryV1;
};

/**
 * Build autonomous commerce strategy intelligence. Does NOT mutate ranking or APPLY.
 */
export function buildAutonomousCommerceStrategy(
  input: AutonomousCommerceStrategyInput,
  options: BuildAutonomousCommerceStrategyOptions = {}
): AutonomousCommerceStrategyResult {
  const started = Date.now();
  const flags = readAutonomousCommerceStrategyFlags();
  const { products, query } = input;
  const sessionMemory = options.sessionMemory ?? input.sessionMemory ?? EMPTY_COMMERCE_SESSION_MEMORY;

  const empty = (): AutonomousCommerceStrategyResult => ({
    products,
    meta: {
      version: AUTONOMOUS_COMMERCE_STRATEGY_VERSION,
      enabled: flags.enabled,
      shadowOnly: true,
      query,
      inputCount: products.length,
      graphNodeCount: 0,
      fusedAxisCount: 0,
      candidateCount: 0,
      strategyConfidence01: 0,
      regretScore01: 0,
      governanceAllowed: false,
      maxInfluence01: 0,
      primaryStrategy: "disabled",
      latencyMs: Date.now() - started,
    },
    trustValueRisk: { trust01: 0, value01: 0, risk01: 0, balance01: 0 },
    timing: { timingScore01: 0, label: "defer" },
    replacement: { strategyLabel: "replacement_distant", score01: 0 },
    upgrade: { pathLabel: "no_upgrade_signal", score01: 0 },
    affordability: { fit01: 0, label: "neutral_fit" },
    economicWeight: { climate: "neutral", weight01: 0 },
    merchantArbitration: { verdict: "merchant_caution", score01: 0 },
    volatility: { band: "low", strategy01: 0 },
    lifecycle: { phase: "discovery", strategy01: 0 },
    premiumValue: { reasoning: "balanced_premium_value", premiumBias01: 0 },
    regional: { regionLabel: "global", adaptation01: 0 },
    regret: { regret01: 0, minimized: true },
    pressure: { balance01: 0, dominantPressure: "general" },
    fusedSignals: [],
    strategyGraph: [],
    shadowCandidates: [],
    explain: {
      whyStrategy: [],
      whyTiming: [],
      whyTrustRisk: [],
      whyRegret: [],
      whyGovernance: ["disabled"],
      whyFusion: [],
      traceExamples: [],
    },
    replayFingerprint: "acs_disabled",
  });

  if (!flags.enabled || products.length === 0) return empty();

  const kernel = runAutonomousStrategyKernel(input, sessionMemory, flags.maxInfluence01);

  const meta: AutonomousCommerceStrategyMeta = {
    version: AUTONOMOUS_COMMERCE_STRATEGY_VERSION,
    enabled: true,
    shadowOnly: true,
    query,
    inputCount: products.length,
    graphNodeCount: kernel.strategyGraph.length,
    fusedAxisCount: kernel.fusedSignals.length,
    candidateCount: kernel.shadowCandidates.length,
    strategyConfidence01: kernel.strategyConfidence01,
    regretScore01: kernel.regret.regret01,
    governanceAllowed: kernel.governanceAllowed,
    maxInfluence01: flags.maxInfluence01,
    primaryStrategy: kernel.primaryStrategy,
    latencyMs: Date.now() - started,
  };

  const result: AutonomousCommerceStrategyResult = {
    products,
    meta,
    trustValueRisk: kernel.trustValueRisk,
    timing: kernel.timing,
    replacement: kernel.replacement,
    upgrade: kernel.upgrade,
    affordability: kernel.affordability,
    economicWeight: kernel.economicWeight,
    merchantArbitration: kernel.merchantArbitration,
    volatility: kernel.volatility,
    lifecycle: kernel.lifecycle,
    premiumValue: kernel.premiumValue,
    regional: kernel.regional,
    regret: kernel.regret,
    pressure: kernel.pressure,
    fusedSignals: kernel.fusedSignals,
    strategyGraph: kernel.strategyGraph,
    shadowCandidates: kernel.shadowCandidates,
    explain: kernel.explain,
    replayFingerprint: "",
  };
  result.replayFingerprint = buildStrategyReplayFingerprint(result);
  return result;
}

export function autonomousCommerceStrategyMetaForSearch(
  result: AutonomousCommerceStrategyResult,
  orchestration?: StrategyOrchestrationSnapshot
): Record<string, unknown> {
  if (!result.meta.enabled) return {};

  return {
    autonomousCommerceStrategy: {
      ...result.meta,
      replayFingerprint: result.replayFingerprint,
      orchestration,
      timingLabel: result.timing.label,
      merchantVerdict: result.merchantArbitration.verdict,
    },
    autonomousCommerceStrategyShadow: {
      trustValueRisk: result.trustValueRisk,
      timing: result.timing,
      replacement: result.replacement,
      upgrade: result.upgrade,
      regret: result.regret,
      premiumValue: result.premiumValue,
      fusedSignalsSample: result.fusedSignals.slice(0, 6).map((s) => ({
        axisId: s.axisId,
        trustAdjusted01: s.trustAdjusted01,
      })),
      strategyGraphSample: result.strategyGraph.slice(0, 5),
      explainSample: {
        whyStrategy: result.explain.whyStrategy,
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

export { snapshotStrategyOrchestration };

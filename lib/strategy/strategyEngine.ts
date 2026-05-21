/**
 * P5.7 — Strategy engine (deterministic strategic cognition orchestration).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { DecisionIntelligenceMeta } from "@/lib/decision/decisionTelemetry";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import {
  computeStrategyBalance,
  computeStrategyBlendInfluence,
  type StrategyBalanceResult,
  type StrategyBlendInfluence,
} from "@/lib/strategy/strategyBalancer";
import { computeStrategyConfidence } from "@/lib/strategy/strategyConfidence";
import { evaluateConversionQuality } from "@/lib/strategy/strategyConversion";
import { evaluateStrategicComparison } from "@/lib/strategy/strategyComparisons";
import { buildStrategicCommerceGraph, type StrategicCommerceGraph } from "@/lib/strategy/strategyGraph";
import { evaluateMarketPositioning } from "@/lib/strategy/strategyMarket";
import type { StrategyProfile } from "@/lib/strategy/strategyProfiles";
import { buildStrategySignals, type StrategySignalBundle } from "@/lib/strategy/strategySignals";
import type { QuantProduct } from "@/lib/shoppingScore";

export type StrategyEngineResult = {
  signals: StrategySignalBundle;
  graph: StrategicCommerceGraph;
  balance: StrategyBalanceResult;
  influence: StrategyBlendInfluence;
  strategyScore: number;
  anomalies: string[];
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function runStrategyEngine(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  fusion: IntentFusionMeta;
  reasoning: AdaptiveReasoningMeta;
  decision: DecisionIntelligenceMeta;
  profile: StrategyProfile;
}): StrategyEngineResult {
  const market = evaluateMarketPositioning({ products: args.products, canonicalQuery: args.canonicalQuery });
  const conversion = evaluateConversionQuality({ products: args.products, market });
  const comparison = evaluateStrategicComparison({
    products: args.products,
    canonicalQuery: args.canonicalQuery,
    decision: args.decision,
  });

  const signals = buildStrategySignals({ ...args, market, conversion, comparison });
  const graph = buildStrategicCommerceGraph({ signals, profile: args.profile });

  let governanceDampen = 1;
  if (args.governance.anomalyDetected) governanceDampen = 0.88;

  const strategyConfidence = computeStrategyConfidence({
    signals,
    decision: args.decision,
    reasoning: args.reasoning,
    profile: args.profile,
    governanceDampen,
  });

  const balance = computeStrategyBalance({
    signals,
    graph,
    strategyConfidence,
    governance: args.governance,
    memory: args.memory,
    decision: args.decision,
    reasoning: args.reasoning,
    orchestration: args.orchestration,
    market,
    profile: args.profile,
  });
  const influence = computeStrategyBlendInfluence({ signals, balance, profile: args.profile });

  const anomalies: string[] = [];
  if (args.profile.requiresGovernancePass && args.governance.anomalyDetected) anomalies.push("governance_gate");
  if (args.profile.requiresDecisionStable && !balance.decisionStable) anomalies.push("decision_unstable");
  if (args.profile.requiresReasoningStable && !balance.reasoningStable) anomalies.push("reasoning_unstable");
  if (influence.strategyDelta > args.profile.maxDelta) anomalies.push("delta_exceeded");
  if (strategyConfidence < 0.3) anomalies.push("low_confidence");

  const strategyScore = clampScore(
    balance.balanceScore * 0.45 + strategyConfidence * 35 + (100 - anomalies.length * 10) * 0.15
  );

  return { signals, graph, balance, influence, strategyScore, anomalies };
}

/**
 * P5.6 — Decision engine (deterministic purchase synthesis orchestration).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import type { AdaptiveReasoningMeta } from "@/lib/reasoning/reasoningTelemetry";
import {
  computeDecisionBalance,
  computeDecisionBlendInfluence,
  type DecisionBalanceResult,
  type DecisionBlendInfluence,
} from "@/lib/decision/decisionBalancer";
import { computeDecisionConfidence } from "@/lib/decision/decisionConfidence";
import { buildCommerceDecisionGraph, type CommerceDecisionGraph } from "@/lib/decision/decisionGraph";
import type { DecisionProfile } from "@/lib/decision/decisionProfiles";
import { buildDecisionSignals, type DecisionSignalBundle } from "@/lib/decision/decisionSignals";
import type { QuantProduct } from "@/lib/shoppingScore";

export type DecisionEngineResult = {
  signals: DecisionSignalBundle;
  graph: CommerceDecisionGraph;
  balance: DecisionBalanceResult;
  influence: DecisionBlendInfluence;
  decisionScore: number;
  anomalies: string[];
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function runDecisionEngine(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  coordination: IntentCoordinationMeta;
  fusion: IntentFusionMeta;
  reasoning: AdaptiveReasoningMeta;
  profile: DecisionProfile;
}): DecisionEngineResult {
  const signals = buildDecisionSignals(args);
  const graph = buildCommerceDecisionGraph({ signals, profile: args.profile });

  let governanceDampen = 1;
  if (args.governance.anomalyDetected) governanceDampen = 0.88;

  const signalConfidence = computeDecisionConfidence({ signals, profile: args.profile, governanceDampen });
  const decisionConfidence = Math.min(
    1,
    Math.round((signalConfidence * 0.35 + args.reasoning.reasoningConfidence * 0.45 + args.fusion.fusionConfidence * 0.2) * 1000) /
      1000
  );

  const balance = computeDecisionBalance({
    signals,
    graph,
    decisionConfidence,
    governance: args.governance,
    calibration: args.calibration,
    orchestration: args.orchestration,
    memory: args.memory,
    fusion: args.fusion,
    reasoning: args.reasoning,
    profile: args.profile,
  });
  const influence = computeDecisionBlendInfluence({ signals, balance, profile: args.profile });

  const anomalies: string[] = [];
  if (args.profile.requiresGovernancePass && args.governance.anomalyDetected) anomalies.push("governance_gate");
  if (args.profile.requiresReasoningStable && !balance.reasoningStable) anomalies.push("reasoning_unstable");
  if (args.profile.requiresFusionStable && !balance.fusionStable) anomalies.push("fusion_unstable");
  if (influence.decisionDelta > args.profile.maxDelta) anomalies.push("delta_exceeded");
  if (decisionConfidence < 0.25) anomalies.push("low_confidence");
  if (signals.returnRiskScore > 0.3) anomalies.push("merchant_risk");

  const decisionScore = clampScore(
    balance.balanceScore * 0.45 + decisionConfidence * 35 + (100 - anomalies.length * 10) * 0.15
  );

  return { signals, graph, balance, influence, decisionScore, anomalies };
}

/**
 * P5.5 — Reasoning engine (deterministic chain orchestration).
 */

import type { CanonicalQueryContract } from "@/lib/search/canonicalQuery";
import type { IntentCalibrationMeta } from "@/lib/intent/intentCalibrationEngine";
import type { IntentCoordinationMeta } from "@/lib/intent/intentCoordination";
import type { IntentFusionMeta } from "@/lib/intent/intentFusionTelemetry";
import type { IntentGovernanceMeta } from "@/lib/intent/intentGovernanceEngine";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentRuntimeMeta } from "@/lib/intent/intentRuntimeController";
import {
  computeReasoningBalance,
  computeReasoningBlendInfluence,
  type ReasoningBalanceResult,
  type ReasoningBlendInfluence,
} from "@/lib/reasoning/reasoningBalancer";
import { buildCommerceReasoningGraph, type CommerceReasoningGraph } from "@/lib/reasoning/reasoningGraph";
import type { ReasoningProfile } from "@/lib/reasoning/reasoningProfiles";
import { buildReasoningSignals, type ReasoningSignalBundle } from "@/lib/reasoning/reasoningSignals";
import type { QuantProduct } from "@/lib/shoppingScore";

export type ReasoningEngineResult = {
  signals: ReasoningSignalBundle;
  graph: CommerceReasoningGraph;
  balance: ReasoningBalanceResult;
  influence: ReasoningBlendInfluence;
  reasoningScore: number;
  anomalies: string[];
};

function clampScore(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function runReasoningEngine(args: {
  products: QuantProduct[];
  canonicalQuery: CanonicalQueryContract;
  governance: IntentGovernanceMeta;
  calibration: IntentCalibrationMeta;
  runtime: IntentRuntimeMeta;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  coordination: IntentCoordinationMeta;
  fusion: IntentFusionMeta;
  profile: ReasoningProfile;
}): ReasoningEngineResult {
  const signals = buildReasoningSignals(args);
  const graph = buildCommerceReasoningGraph({ signals, profile: args.profile });
  const balance = computeReasoningBalance({ signals, graph, ...args });
  const influence = computeReasoningBlendInfluence({ signals, balance, profile: args.profile });

  const anomalies: string[] = [];
  if (args.profile.requiresGovernancePass && args.governance.anomalyDetected) anomalies.push("governance_gate");
  if (args.profile.requiresFusionStable && !balance.fusionStable) anomalies.push("fusion_unstable");
  if (args.profile.requiresCoordinationStable && !balance.coordinationStable) anomalies.push("coordination_unstable");
  if (influence.reasoningDelta > args.profile.maxDelta) anomalies.push("delta_exceeded");
  if (signals.reasoningConfidence < 0.3) anomalies.push("low_confidence");

  const reasoningScore = clampScore(
    balance.balanceScore * 0.45 + signals.reasoningConfidence * 40 + (100 - anomalies.length * 10) * 0.15
  );

  return { signals, graph, balance, influence, reasoningScore, anomalies };
}

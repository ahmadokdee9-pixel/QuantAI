/**
 * P6.2 — Multi-objective confidence + signal bundle.
 */

import type { MultiObjectiveContradictionResult } from "@/lib/multiObjective/multiObjectiveContradictions";
import type { UnifiedMultiObjectiveState } from "@/lib/multiObjective/multiObjectiveFusion";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { CognitionEngineMeta } from "@/lib/cognition/cognitionTelemetry";

export type MultiObjectiveSignalBundle = {
  qualityObjective: number;
  priceObjective: number;
  trustObjective: number;
  valueObjective: number;
  intentObjective: number;
  aestheticObjective: number;
  stabilityObjective: number;
  conversionObjective: number;
  objectiveBalance: number;
  objectiveContinuity: number;
  signalHash: string;
  graphExecutionHash: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function buildMultiObjectiveSignalBundle(args: {
  state: UnifiedMultiObjectiveState;
  intent: IntentCognitionMeta;
  cognition: CognitionEngineMeta;
}): MultiObjectiveSignalBundle {
  const objectiveContinuity = round3(
    clamp(
      (args.intent.analytics?.continuityAnalytics ?? 0) * 0.01 * 0.4 +
        (args.cognition.cognitionStability ?? 0) * 0.35 +
        args.state.stabilityObjective * 0.25,
      0,
      1
    )
  );

  const core = {
    qualityObjective: args.state.qualityObjective,
    priceObjective: args.state.priceObjective,
    trustObjective: args.state.trustObjective,
    valueObjective: args.state.valueObjective,
    intentObjective: args.state.intentObjective,
    aestheticObjective: args.state.aestheticObjective,
    stabilityObjective: args.state.stabilityObjective,
    conversionObjective: args.state.conversionObjective,
    objectiveBalance: args.state.objectiveBalance,
    objectiveContinuity,
  };

  const signalHash = Object.entries(core)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(Number(v) * 1000)}`)
    .join("|");

  const graphExecutionHash = [
    `q:${core.qualityObjective}`,
    `p:${core.priceObjective}`,
    `t:${core.trustObjective}`,
    `v:${core.valueObjective}`,
    `i:${core.intentObjective}`,
    `a:${core.aestheticObjective}`,
    `s:${core.stabilityObjective}`,
    `c:${core.conversionObjective}`,
  ].join(",");

  return { ...core, signalHash, graphExecutionHash };
}

export function computeMultiObjectiveConfidence(args: {
  signals: MultiObjectiveSignalBundle;
  intent: IntentCognitionMeta;
  cognition: CognitionEngineMeta;
  contradictions: MultiObjectiveContradictionResult;
  governanceDampen: number;
}): number {
  const { signals, intent, cognition, contradictions, governanceDampen } = args;

  const signalConfidence = clamp(
    signals.objectiveBalance * 0.2 +
      signals.stabilityObjective * 0.15 +
      signals.intentObjective * 0.12 +
      signals.conversionObjective * 0.12 +
      signals.trustObjective * 0.1 +
      signals.qualityObjective * 0.1 +
      (intent.intentConfidence ?? 0) * 0.1 +
      (cognition.cognitionConfidence ?? 0) * 0.11,
    0,
    1
  );

  return round3(clamp((signalConfidence - contradictions.uncertaintyScore * 0.1) * governanceDampen, 0, 1));
}

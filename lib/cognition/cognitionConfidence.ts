/**
 * P6.0 — Cognition stability + confidence scoring.
 */

import type { CognitionProfile } from "@/lib/cognition/cognitionProfiles";
import type { CognitionContradictionResult } from "@/lib/cognition/cognitionContradictions";
import type { UnifiedCommerceState } from "@/lib/cognition/cognitionFusion";
import type { UnifiedCognitionGraph } from "@/lib/cognition/cognitionGraph";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function computeCognitionConfidence(args: {
  state: UnifiedCommerceState;
  graph: UnifiedCognitionGraph;
  contradictions: CognitionContradictionResult;
  governanceDampen: number;
}): number {
  const { state, graph, contradictions, governanceDampen } = args;

  const signalConfidence = clamp(
    state.conversionProbability * 0.22 +
      state.trustValueBalance * 0.18 +
      state.behavioralReadinessFusion * 0.15 +
      state.strategyFusion * 0.12 +
      state.marketStateFusion * 0.1 +
      state.rankingContinuity * 0.1 +
      graph.graphIntegrity * 0.01 * 0.13,
    0,
    1
  );

  const penalty = contradictions.contradictionSeverity * 0.15;
  return round3(clamp((signalConfidence - penalty) * governanceDampen, 0, 1));
}

export function computeCognitionStability(args: {
  state: UnifiedCommerceState;
  graph: UnifiedCognitionGraph;
  contradictions: CognitionContradictionResult;
  cognitionConfidence: number;
}): number {
  const { state, graph, contradictions, cognitionConfidence } = args;

  return round3(
    clamp(
      cognitionConfidence * 0.4 +
        state.rankingContinuity * 0.25 +
        state.replayIntegrity * 0.2 +
        graph.graphIntegrity * 0.01 * 0.15 -
        contradictions.contradictionSeverity * 0.1,
      0,
      1
    )
  );
}

export function computeCognitionScore(args: {
  cognitionConfidence: number;
  cognitionStability: number;
  graph: UnifiedCognitionGraph;
  anomalyCount: number;
}): number {
  const { cognitionConfidence, cognitionStability, graph, anomalyCount } = args;
  return Math.min(
    100,
    Math.round(cognitionConfidence * 35 + cognitionStability * 35 + graph.graphIntegrity * 0.2 + (100 - anomalyCount * 10) * 0.1)
  );
}

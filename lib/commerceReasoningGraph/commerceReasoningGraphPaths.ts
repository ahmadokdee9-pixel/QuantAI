/**
 * P6.7 — Bounded commerce reasoning paths + deterministic chains (no user memory).
 */

import type { CommerceDecisionIntelligenceMeta } from "@/lib/commerceDecision/commerceDecisionTelemetry";
import type { MarketRealityIntelligenceMeta } from "@/lib/marketReality/marketRealityTelemetry";
import type { MemorylessCommerceLearningMeta } from "@/lib/memorylessLearning/memorylessLearningTelemetry";
import type { AdaptiveStrategicRankingMeta } from "@/lib/strategicRanking/strategicRankingTelemetry";
import type { IntentCognitionMeta } from "@/lib/intent/intentTelemetry";
import type { MultiObjectiveCommerceMeta } from "@/lib/multiObjective/multiObjectiveTelemetry";
import { COMMERCE_REASONING_GRAPH_MAX_PATH_DEPTH } from "@/lib/commerceReasoningGraph/commerceReasoningGraphFlags";

export type CommerceReasoningGraphNode = {
  id: string;
  score: number;
  delta: number;
  confidence: number;
  lane: string;
};

export type CommerceReasoningGraphPath = {
  nodes: CommerceReasoningGraphNode[];
  pathStrength: number;
  pathDepth: number;
  chainHash: string;
  snapshotHash: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function buildCommerceReasoningGraphPath(args: {
  intent: IntentCognitionMeta;
  multiObjective: MultiObjectiveCommerceMeta;
  strategic: AdaptiveStrategicRankingMeta;
  memoryless: MemorylessCommerceLearningMeta;
  marketReality: MarketRealityIntelligenceMeta;
  commerceDecision: CommerceDecisionIntelligenceMeta;
}): CommerceReasoningGraphPath {
  const nodes: CommerceReasoningGraphNode[] = [
    { id: "intent", score: args.intent.intentScore ?? 0, delta: args.intent.intentDelta ?? 0, confidence: args.intent.intentConfidence ?? 0, lane: String(args.intent.routingLane ?? "hold") },
    { id: "multi_objective", score: args.multiObjective.multiObjectiveScore ?? 0, delta: args.multiObjective.multiObjectiveDelta ?? 0, confidence: args.multiObjective.multiObjectiveConfidence ?? 0, lane: String(args.multiObjective.routingLane ?? "hold") },
    { id: "strategic", score: args.strategic.strategicRankingScore ?? 0, delta: args.strategic.strategicRankingDelta ?? 0, confidence: args.strategic.strategicRankingConfidence ?? 0, lane: String(args.strategic.routingLane ?? "hold") },
    { id: "memoryless", score: args.memoryless.learningScore ?? 0, delta: args.memoryless.learningDelta ?? 0, confidence: args.memoryless.learningConfidence ?? 0, lane: String(args.memoryless.routingLane ?? "hold") },
    { id: "market_reality", score: args.marketReality.realityScore ?? 0, delta: args.marketReality.realityDelta ?? 0, confidence: args.marketReality.realityConfidence ?? 0, lane: String(args.marketReality.routingLane ?? "hold") },
    { id: "commerce_decision", score: args.commerceDecision.decisionScore ?? 0, delta: args.commerceDecision.decisionDelta ?? 0, confidence: args.commerceDecision.decisionConfidence ?? 0, lane: String(args.commerceDecision.routingLane ?? "hold") },
  ].slice(0, COMMERCE_REASONING_GRAPH_MAX_PATH_DEPTH);

  const pathStrength = round3(clamp(Math.min(...nodes.map((n) => n.confidence)), 0, 1));
  const chainHash = nodes.map((n) => `${n.id}:${Math.round(n.score)}:${Math.round(n.delta * 1000)}`).join("->");
  const snapshotHash = nodes.map((n) => `${n.id}|${n.lane}|${Math.round(n.confidence * 1000)}`).join(";");

  return { nodes, pathStrength, pathDepth: nodes.length, chainHash, snapshotHash };
}

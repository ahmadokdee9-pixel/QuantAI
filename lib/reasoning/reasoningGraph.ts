/**
 * P5.5 — Deterministic reasoning graph (bounded chains; no self-modifying graph).
 */

import type { ReasoningProfile } from "@/lib/reasoning/reasoningProfiles";
import type { ReasoningSignalBundle } from "@/lib/reasoning/reasoningSignals";

export type ReasoningGraphNode = {
  id: string;
  chain: string;
  weight: number;
};

export type ReasoningGraphEdge = {
  from: string;
  to: string;
  weight: number;
};

export type CommerceReasoningGraph = {
  nodes: ReasoningGraphNode[];
  edges: ReasoningGraphEdge[];
  graphIntegrity: number;
  chainDepth: number;
  executionHash: string;
};

const CHAINS: { id: string; chain: string; signalKey: keyof ReasoningSignalBundle }[] = [
  { id: "trust_value", chain: "trust/value", signalKey: "trust" },
  { id: "premium_budget", chain: "premium/budget", signalKey: "premium" },
  { id: "quality_price", chain: "quality/price", signalKey: "quality" },
  { id: "urgency_avail", chain: "urgency/availability", signalKey: "urgency" },
  { id: "merchant_rel", chain: "merchant/reliability", signalKey: "merchantReliability" },
  { id: "recommendation", chain: "recommendation/confidence", signalKey: "recommendationStrength" },
  { id: "comparison", chain: "comparison/intelligence", signalKey: "comparisonConfidence" },
  { id: "suppression_div", chain: "suppression/diversity", signalKey: "suppressionRecovery" },
  { id: "continuity", chain: "continuity/ranking", signalKey: "rankingContinuity" },
];

const CHAIN_EDGES: [string, string][] = [
  ["trust_value", "merchant_rel"],
  ["premium_budget", "quality_price"],
  ["comparison", "recommendation"],
  ["continuity", "trust_value"],
  ["suppression_div", "continuity"],
];

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function buildCommerceReasoningGraph(args: {
  signals: ReasoningSignalBundle;
  profile: ReasoningProfile;
}): CommerceReasoningGraph {
  const { signals, profile } = args;

  const nodes: ReasoningGraphNode[] = CHAINS.map((c) => ({
    id: c.id,
    chain: c.chain,
    weight: round3(Number(signals[c.signalKey]) * profile.maxDelta),
  })).sort((a, b) => a.id.localeCompare(b.id));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges: ReasoningGraphEdge[] = CHAIN_EDGES.filter(([a, b]) => nodeMap.has(a) && nodeMap.has(b)).map(
    ([from, to]) => ({
      from,
      to,
      weight: round3((nodeMap.get(from)!.weight + nodeMap.get(to)!.weight) * 0.5),
    })
  );

  const avgWeight = nodes.reduce((s, n) => s + n.weight, 0) / Math.max(1, nodes.length);
  const graphIntegrity = clamp(Math.round(avgWeight * 80 + edges.length * 5 + signals.reasoningConfidence * 15), 0, 100);

  const executionHash = [
    nodes.map((n) => `${n.id}:${n.weight}`).join(","),
    edges.map((e) => `${e.from}->${e.to}:${e.weight}`).join(","),
  ].join("|");

  return {
    nodes,
    edges,
    graphIntegrity,
    chainDepth: nodes.length,
    executionHash,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function validateReasoningGraphReplay(a: CommerceReasoningGraph, b: CommerceReasoningGraph): boolean {
  return a.executionHash === b.executionHash && a.chainDepth === b.chainDepth;
}

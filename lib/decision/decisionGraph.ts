/**
 * P5.6 — Deterministic decision graph (tradeoff chains; no self-modifying graph).
 */

import type { DecisionProfile } from "@/lib/decision/decisionProfiles";
import type { DecisionSignalBundle } from "@/lib/decision/decisionSignals";

export type DecisionGraphNode = {
  id: string;
  tradeoff: string;
  weight: number;
};

export type DecisionGraphEdge = {
  from: string;
  to: string;
  weight: number;
};

export type CommerceDecisionGraph = {
  nodes: DecisionGraphNode[];
  edges: DecisionGraphEdge[];
  graphIntegrity: number;
  tradeoffCount: number;
  executionHash: string;
};

const TRADEOFFS: { id: string; tradeoff: string; keys: (keyof DecisionSignalBundle)[] }[] = [
  { id: "trust_price", tradeoff: "trust vs price", keys: ["trustScore", "valueScore"] },
  { id: "value_premium", tradeoff: "value vs premium", keys: ["valueScore", "premiumScore"] },
  { id: "quality_budget", tradeoff: "quality vs budget", keys: ["qualityConfidence", "budgetAlignment"] },
  { id: "urgency_avail", tradeoff: "urgency vs availability", keys: ["urgencyConfidence", "deliveryConfidence"] },
  { id: "merchant_risk", tradeoff: "merchant risk", keys: ["merchantReliability", "returnRiskScore"] },
  { id: "recommendation", tradeoff: "recommendation confidence", keys: ["recommendationStrength"] },
  { id: "comparison", tradeoff: "comparison decision", keys: ["comparisonConfidence"] },
  { id: "discount_auth", tradeoff: "discount authenticity", keys: ["discountAuthenticity"] },
  { id: "long_term", tradeoff: "long-term value", keys: ["stabilityScore", "valueScore"] },
  { id: "continuity", tradeoff: "ranking continuity", keys: ["rankingContinuity", "replayIntegrity"] },
];

const TRADEOFF_EDGES: [string, string][] = [
  ["trust_price", "merchant_risk"],
  ["value_premium", "quality_budget"],
  ["comparison", "recommendation"],
  ["continuity", "trust_price"],
  ["discount_auth", "merchant_risk"],
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function buildCommerceDecisionGraph(args: {
  signals: DecisionSignalBundle;
  profile: DecisionProfile;
}): CommerceDecisionGraph {
  const { signals, profile } = args;

  const nodes: DecisionGraphNode[] = TRADEOFFS.map((t) => {
    const vals = t.keys.map((k) => Number(signals[k])).filter((v) => Number.isFinite(v));
    const weight = round3((vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length)) * profile.maxDelta);
    return { id: t.id, tradeoff: t.tradeoff, weight };
  }).sort((a, b) => a.id.localeCompare(b.id));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges: DecisionGraphEdge[] = TRADEOFF_EDGES.filter(([a, b]) => nodeMap.has(a) && nodeMap.has(b)).map(
    ([from, to]) => ({
      from,
      to,
      weight: round3((nodeMap.get(from)!.weight + nodeMap.get(to)!.weight) * 0.5),
    })
  );

  const avgWeight = nodes.reduce((s, n) => s + n.weight, 0) / Math.max(1, nodes.length);
  const graphIntegrity = clamp(Math.round(avgWeight * 85 + edges.length * 4 + signals.replayIntegrity * 10), 0, 100);

  const executionHash = [
    nodes.map((n) => `${n.id}:${n.weight}`).join(","),
    edges.map((e) => `${e.from}->${e.to}:${e.weight}`).join(","),
  ].join("|");

  return { nodes, edges, graphIntegrity, tradeoffCount: nodes.length, executionHash };
}

export function validateDecisionGraphReplay(a: CommerceDecisionGraph, b: CommerceDecisionGraph): boolean {
  return a.executionHash === b.executionHash && a.tradeoffCount === b.tradeoffCount;
}

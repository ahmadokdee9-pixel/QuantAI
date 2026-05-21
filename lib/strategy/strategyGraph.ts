/**
 * P5.7 — Strategic commerce graph (deterministic cognition chains).
 */

import type { StrategyProfile } from "@/lib/strategy/strategyProfiles";
import type { StrategySignalBundle } from "@/lib/strategy/strategySignals";

export type StrategyGraphNode = {
  id: string;
  domain: string;
  weight: number;
};

export type StrategyGraphEdge = {
  from: string;
  to: string;
  weight: number;
};

export type StrategicCommerceGraph = {
  nodes: StrategyGraphNode[];
  edges: StrategyGraphEdge[];
  graphIntegrity: number;
  domainCount: number;
  executionHash: string;
};

const DOMAINS: { id: string; domain: string; keys: (keyof StrategySignalBundle)[] }[] = [
  { id: "conversion", domain: "conversion-quality", keys: ["conversionConfidence", "productAttractiveness"] },
  { id: "trust_conv", domain: "trust-to-conversion", keys: ["strategicTrust", "conversionConfidence"] },
  { id: "premium_value", domain: "premium-vs-value", keys: ["premiumPositioning", "strategicValue"] },
  { id: "comparison", domain: "strategic-comparison", keys: ["comparisonIntelligence"] },
  { id: "category", domain: "category-dominance", keys: ["categoryDominance"] },
  { id: "merchant", domain: "merchant-positioning", keys: ["merchantStrength"] },
  { id: "momentum", domain: "product-momentum", keys: ["momentumConfidence"] },
  { id: "market", domain: "market-positioning", keys: ["marketPositioning"] },
  { id: "continuity", domain: "ranking-continuity", keys: ["rankingContinuity", "replayIntegrity"] },
];

const DOMAIN_EDGES: [string, string][] = [
  ["conversion", "trust_conv"],
  ["premium_value", "comparison"],
  ["category", "market"],
  ["continuity", "conversion"],
  ["merchant", "trust_conv"],
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function buildStrategicCommerceGraph(args: {
  signals: StrategySignalBundle;
  profile: StrategyProfile;
}): StrategicCommerceGraph {
  const { signals, profile } = args;

  const nodes: StrategyGraphNode[] = DOMAINS.map((d) => {
    const vals = d.keys.map((k) => Number(signals[k])).filter((v) => Number.isFinite(v));
    const weight = round3((vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length)) * profile.maxDelta);
    return { id: d.id, domain: d.domain, weight };
  }).sort((a, b) => a.id.localeCompare(b.id));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges: StrategyGraphEdge[] = DOMAIN_EDGES.filter(([a, b]) => nodeMap.has(a) && nodeMap.has(b)).map(
    ([from, to]) => ({
      from,
      to,
      weight: round3((nodeMap.get(from)!.weight + nodeMap.get(to)!.weight) * 0.5),
    })
  );

  const avgWeight = nodes.reduce((s, n) => s + n.weight, 0) / Math.max(1, nodes.length);
  const graphIntegrity = clamp(
    Math.round(avgWeight * 85 + edges.length * 4 + signals.conversionConfidence * 12),
    0,
    100
  );

  const executionHash = [
    nodes.map((n) => `${n.id}:${n.weight}`).join(","),
    edges.map((e) => `${e.from}->${e.to}:${e.weight}`).join(","),
  ].join("|");

  return { nodes, edges, graphIntegrity, domainCount: nodes.length, executionHash };
}

export function validateStrategyGraphReplay(a: StrategicCommerceGraph, b: StrategicCommerceGraph): boolean {
  return a.executionHash === b.executionHash && a.domainCount === b.domainCount;
}

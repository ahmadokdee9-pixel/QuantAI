/**
 * P6.0 — Unified commerce cognition graph (deterministic nodes + edges).
 */

import type { CognitionProfile } from "@/lib/cognition/cognitionProfiles";
import type { UnifiedCommerceState } from "@/lib/cognition/cognitionFusion";

export type CognitionGraphNode = {
  id: string;
  domain: string;
  weight: number;
};

export type CognitionGraphEdge = {
  from: string;
  to: string;
  weight: number;
};

export type UnifiedCognitionGraph = {
  nodes: CognitionGraphNode[];
  edges: CognitionGraphEdge[];
  graphIntegrity: number;
  domainCount: number;
  executionHash: string;
};

const DOMAINS: { id: string; domain: string; key: keyof UnifiedCommerceState }[] = [
  { id: "reasoning", domain: "adaptive-reasoning", key: "reasoningFusion" },
  { id: "strategy", domain: "strategic-commerce", key: "strategyFusion" },
  { id: "market", domain: "market-state", key: "marketStateFusion" },
  { id: "behavioral", domain: "behavioral-readiness", key: "behavioralReadinessFusion" },
  { id: "trust_value", domain: "trust-value-balance", key: "trustValueBalance" },
  { id: "conversion", domain: "conversion-probability", key: "conversionProbability" },
  { id: "continuity", domain: "ranking-continuity", key: "rankingContinuity" },
];

const DOMAIN_EDGES: [string, string][] = [
  ["reasoning", "strategy"],
  ["strategy", "market"],
  ["market", "behavioral"],
  ["trust_value", "conversion"],
  ["continuity", "conversion"],
  ["behavioral", "conversion"],
];

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function buildUnifiedCognitionGraph(args: {
  state: UnifiedCommerceState;
  profile: CognitionProfile;
}): UnifiedCognitionGraph {
  const { state, profile } = args;

  const nodes: CognitionGraphNode[] = DOMAINS.map((d) => ({
    id: d.id,
    domain: d.domain,
    weight: round3(Number(state[d.key]) * profile.maxDelta),
  })).sort((a, b) => a.id.localeCompare(b.id));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges: CognitionGraphEdge[] = DOMAIN_EDGES.filter(([a, b]) => nodeMap.has(a) && nodeMap.has(b)).map(
    ([from, to]) => ({
      from,
      to,
      weight: round3((nodeMap.get(from)!.weight + nodeMap.get(to)!.weight) * 0.5),
    })
  );

  const avgWeight = nodes.reduce((s, n) => s + n.weight, 0) / Math.max(1, nodes.length);
  const graphIntegrity = clamp(Math.round(avgWeight * 85 + edges.length * 5 + state.conversionProbability * 10), 0, 100);

  const executionHash = [
    nodes.map((n) => `${n.id}:${n.weight}`).join(","),
    edges.map((e) => `${e.from}->${e.to}:${e.weight}`).join(","),
  ].join("|");

  return { nodes, edges, graphIntegrity, domainCount: nodes.length, executionHash };
}

export function validateCognitionGraphReplay(a: UnifiedCognitionGraph, b: UnifiedCognitionGraph): boolean {
  return a.executionHash === b.executionHash && a.domainCount === b.domainCount;
}

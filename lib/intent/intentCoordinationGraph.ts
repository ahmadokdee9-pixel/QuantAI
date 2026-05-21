/**
 * P5.3 — Deterministic commerce reasoning graph (no self-modifying graph).
 */

import type { IntentCoordinationProfile } from "@/lib/intent/intentCoordinationProfiles";
import type { IntentMemoryMeta } from "@/lib/intent/intentMemory";
import type { IntentOrchestrationMeta } from "@/lib/intent/intentOrchestrator";
import type { IntentPartition, QueryDecomposition } from "@/lib/intent/intentQueryDecomposer";

export type IntentGraphNode = {
  id: string;
  partitionId: string;
  weight: number;
  priority: number;
};

export type IntentGraphEdge = {
  from: string;
  to: string;
  kind: "conflict" | "reinforce";
  weight: number;
};

export type CommerceReasoningGraph = {
  nodes: IntentGraphNode[];
  edges: IntentGraphEdge[];
  graphIntegrity: number;
  trustPropagation: number;
  suppressionCoordination: number;
  diversityCoordination: number;
  stabilizationRoute: "hold" | "balance" | "reinforce" | "resolve";
  executionHash: string;
};

const CONFLICT_EDGES: [string, string][] = [
  ["premium", "budget"],
  ["premium", "discount"],
  ["compare", "recommendation"],
  ["urgent", "review"],
];

const REINFORCE_EDGES: [string, string][] = [
  ["compare", "trust"],
  ["budget", "quality"],
  ["trust", "premium"],
  ["urgent", "trust"],
  ["compare", "budget"],
];

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function buildNodes(partitions: IntentPartition[]): IntentGraphNode[] {
  return partitions.map((p, i) => ({
    id: `node:${p.id}:${i}`,
    partitionId: p.id,
    weight: Math.round(p.modifierStrength * p.priority) / 100,
    priority: p.priority,
  }));
}

function buildEdges(nodes: IntentGraphNode[]): IntentGraphEdge[] {
  const edges: IntentGraphEdge[] = [];
  const byPartition = new Map<string, IntentGraphNode>();
  for (const n of nodes) {
    if (!byPartition.has(n.partitionId)) byPartition.set(n.partitionId, n);
  }

  for (const [a, b] of CONFLICT_EDGES) {
    const na = byPartition.get(a);
    const nb = byPartition.get(b);
    if (na && nb) {
      edges.push({
        from: na.id,
        to: nb.id,
        kind: "conflict",
        weight: Math.round((na.weight + nb.weight) * 50) / 100,
      });
    }
  }

  for (const [a, b] of REINFORCE_EDGES) {
    const na = byPartition.get(a);
    const nb = byPartition.get(b);
    if (na && nb) {
      edges.push({
        from: na.id,
        to: nb.id,
        kind: "reinforce",
        weight: Math.round((na.weight + nb.weight) * 40) / 100,
      });
    }
  }

  return edges.sort((x, y) => x.from.localeCompare(y.from) || x.to.localeCompare(y.to));
}

function computeExecutionHash(nodes: IntentGraphNode[], edges: IntentGraphEdge[]): string {
  const n = nodes.map((x) => `${x.partitionId}:${x.weight}`).join(",");
  const e = edges.map((x) => `${x.kind}:${x.from}->${x.to}:${x.weight}`).join(",");
  return `${n}|${e}`;
}

export function buildCommerceReasoningGraph(args: {
  decomposition: QueryDecomposition;
  orchestration: IntentOrchestrationMeta;
  memory: IntentMemoryMeta;
  profile: IntentCoordinationProfile;
}): CommerceReasoningGraph {
  const { decomposition, orchestration, memory, profile } = args;
  const nodes = buildNodes(decomposition.partitions);
  const edges = buildEdges(nodes);

  const conflictCount = edges.filter((e) => e.kind === "conflict").length;
  const reinforceCount = edges.filter((e) => e.kind === "reinforce").length;
  const nodeCoverage = Math.min(100, nodes.length * 15);
  const graphIntegrity = clamp(
    Math.round(nodeCoverage - conflictCount * 8 + reinforceCount * 5 + (memory.replayMemoryIntegrity >= 60 ? 10 : 0)),
    0,
    100
  );

  const trustPropagation = clamp(
    orchestration.trustBalance * 0.4 * profile.maxTrustPropagation + memory.trustMemory * 0.2,
    0,
    profile.maxTrustPropagation
  );
  const suppressionCoordination = clamp(
    orchestration.suppressionBalance * 0.35 * profile.maxSuppressionRebalance + memory.suppressionMemory * 0.15,
    0,
    profile.maxSuppressionRebalance
  );
  const diversityCoordination = clamp(
    orchestration.diversityBalance * 0.35 * profile.maxDiversityCoordination + memory.diversityMemory * 0.15,
    0,
    profile.maxDiversityCoordination
  );

  let stabilizationRoute: CommerceReasoningGraph["stabilizationRoute"] = "balance";
  if (decomposition.routingLane === "hold" || nodes.length === 0) stabilizationRoute = "hold";
  else if (decomposition.routingLane === "conflict") stabilizationRoute = "resolve";
  else if (decomposition.routingLane === "reinforce") stabilizationRoute = "reinforce";

  return {
    nodes,
    edges,
    graphIntegrity,
    trustPropagation: Math.round(trustPropagation * 1000) / 1000,
    suppressionCoordination: Math.round(suppressionCoordination * 1000) / 1000,
    diversityCoordination: Math.round(diversityCoordination * 1000) / 1000,
    stabilizationRoute,
    executionHash: computeExecutionHash(nodes, edges),
  };
}

export function validateGraphExecutionReplay(a: CommerceReasoningGraph, b: CommerceReasoningGraph): boolean {
  return a.executionHash === b.executionHash && a.stabilizationRoute === b.stabilizationRoute;
}

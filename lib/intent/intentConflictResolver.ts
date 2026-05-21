/**
 * P5.3 — Deterministic intent conflict resolution (no autonomous reasoning).
 */

import type { CommerceReasoningGraph } from "@/lib/intent/intentCoordinationGraph";
import type { QueryDecomposition } from "@/lib/intent/intentQueryDecomposer";

export type ConflictResolution = {
  conflictScore: number;
  resolvedWeight: number;
  escalationDetected: boolean;
  dominantPartition: string | null;
  dampeningFactor: number;
  resolutionLane: "neutral" | "trust_first" | "value_first" | "compare_first";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function resolveIntentConflicts(args: {
  decomposition: QueryDecomposition;
  graph: CommerceReasoningGraph;
}): ConflictResolution {
  const { decomposition, graph } = args;
  const conflicts = graph.edges.filter((e) => e.kind === "conflict");
  const conflictScore = Math.min(100, conflicts.reduce((s, e) => s + e.weight * 20, 0));

  const dominant = decomposition.partitions[0]?.id ?? null;
  let resolutionLane: ConflictResolution["resolutionLane"] = "neutral";
  if (dominant === "trust" || decomposition.partitions.some((p) => p.id === "trust")) resolutionLane = "trust_first";
  else if (dominant === "compare") resolutionLane = "compare_first";
  else if (dominant === "budget" || dominant === "discount") resolutionLane = "value_first";

  const reinforceBoost = graph.edges.filter((e) => e.kind === "reinforce").reduce((s, e) => s + e.weight, 0);
  const resolvedWeight = clamp(
    decomposition.partitions.reduce((s, p) => s + p.modifierStrength, 0) / Math.max(1, decomposition.partitions.length) +
      reinforceBoost * 0.1 -
      conflictScore * 0.005,
    0,
    1
  );

  const dampeningFactor = clamp(1 - conflictScore * 0.004, 0.6, 1);
  const escalationDetected = conflictScore >= 60 && decomposition.routingLane === "conflict";

  return {
    conflictScore: Math.round(conflictScore),
    resolvedWeight: Math.round(resolvedWeight * 1000) / 1000,
    escalationDetected,
    dominantPartition: dominant,
    dampeningFactor: Math.round(dampeningFactor * 1000) / 1000,
    resolutionLane,
  };
}

/**
 * Phase 11 — Unified commerce decision graph.
 */

import type { BrainArbitrationVerdict, FusedIntelligenceSignal, UnifiedDecisionNode } from "../types";

const MAX_NODES = 16;

export function buildUnifiedCommerceDecisionGraph(args: {
  signals: FusedIntelligenceSignal[];
  arbitration: BrainArbitrationVerdict;
}): UnifiedDecisionNode[] {
  const nodes: UnifiedDecisionNode[] = [];
  let priority = 1;
  for (const s of args.signals.slice(0, MAX_NODES)) {
    nodes.push({
      nodeId: `${s.layer}_${s.signalId}`,
      layer: s.layer,
      priority: priority++,
      weight01: s.weight01,
    });
  }
  nodes.unshift({
    nodeId: `arb_${args.arbitration.primaryLayer}`,
    layer: args.arbitration.primaryLayer,
    priority: 0,
    weight01: args.arbitration.arbitrationScore01,
  });
  return nodes.slice(0, MAX_NODES);
}

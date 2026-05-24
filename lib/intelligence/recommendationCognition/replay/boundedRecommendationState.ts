/**
 * Phase 7 — Bounded recommendation state (cognition growth caps).
 */

import { MAX_COGNITION_BYTES, MAX_GRAPH_NODES, MAX_SHADOW_CANDIDATES } from "../contracts/deterministicRecommendationContracts";

export type BoundedRecommendationState = {
  candidateCount: number;
  graphNodeCount: number;
  estimatedBytes: number;
  withinBounds: boolean;
};

export function computeBoundedRecommendationState(args: {
  candidateCount: number;
  graphNodeCount: number;
}): BoundedRecommendationState {
  const candidateCount = Math.min(args.candidateCount, MAX_SHADOW_CANDIDATES);
  const graphNodeCount = Math.min(args.graphNodeCount, MAX_GRAPH_NODES);
  const estimatedBytes = candidateCount * 96 + graphNodeCount * 48;
  return {
    candidateCount,
    graphNodeCount,
    estimatedBytes,
    withinBounds: estimatedBytes <= MAX_COGNITION_BYTES,
  };
}

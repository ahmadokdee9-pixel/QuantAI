/**
 * Phase 7 — Deterministic recommendation contracts.
 */

export const RECOMMENDATION_REPLAY_CONTRACT_VERSION = "phase7";

export const MAX_SHADOW_CANDIDATES = 16;
export const MAX_GRAPH_NODES = 64;
export const MAX_COGNITION_BYTES = 20_480;

export type DeterministicRecommendationContract = {
  version: string;
  embeddingFree: true;
  vectorDbFree: true;
  generativeAgentFree: true;
  rankingMutation: false;
  shadowOnly: true;
  maxLatencyMs: number;
  replaySafe: true;
  boundedExecution: true;
  maxCandidates: number;
  maxGraphNodes: number;
};

export const DEFAULT_RECOMMENDATION_CONTRACT: DeterministicRecommendationContract = {
  version: RECOMMENDATION_REPLAY_CONTRACT_VERSION,
  embeddingFree: true,
  vectorDbFree: true,
  generativeAgentFree: true,
  rankingMutation: false,
  shadowOnly: true,
  maxLatencyMs: 25,
  replaySafe: true,
  boundedExecution: true,
  maxCandidates: MAX_SHADOW_CANDIDATES,
  maxGraphNodes: MAX_GRAPH_NODES,
};

export function validateRecommendationContract(c: DeterministicRecommendationContract): string[] {
  const errors: string[] = [];
  if (!c.embeddingFree) errors.push("embeddingFree required");
  if (!c.vectorDbFree) errors.push("vectorDbFree required");
  if (!c.generativeAgentFree) errors.push("generativeAgentFree required");
  if (c.rankingMutation !== false) errors.push("rankingMutation must be false");
  if (!c.shadowOnly) errors.push("shadowOnly required");
  if (c.maxLatencyMs <= 0) errors.push("maxLatencyMs must be > 0");
  return errors;
}

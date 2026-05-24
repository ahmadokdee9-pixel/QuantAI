/**
 * Phase 8 — Orchestration replay contracts.
 */

export const ORCHESTRATION_REPLAY_VERSION = "phase8";

export const MAX_COGNITION_GRAPH_NODES = 24;
export const MAX_STRATEGY_LAYERS = 6;
export const MAX_COGNITION_BYTES = 24_576;

export type OrchestrationReplayContract = {
  version: string;
  embeddingFree: true;
  vectorDbFree: true;
  agentFree: true;
  rankingMutation: false;
  shadowOnly: true;
  maxLatencyMs: number;
  replaySafe: true;
  boundedExecution: true;
};

export const DEFAULT_ORCHESTRATION_REPLAY_CONTRACT: OrchestrationReplayContract = {
  version: ORCHESTRATION_REPLAY_VERSION,
  embeddingFree: true,
  vectorDbFree: true,
  agentFree: true,
  rankingMutation: false,
  shadowOnly: true,
  maxLatencyMs: 30,
  replaySafe: true,
  boundedExecution: true,
};

export function validateOrchestrationReplayContract(c: OrchestrationReplayContract): string[] {
  const errors: string[] = [];
  if (!c.embeddingFree) errors.push("embeddingFree required");
  if (!c.vectorDbFree) errors.push("vectorDbFree required");
  if (!c.agentFree) errors.push("agentFree required");
  if (c.rankingMutation !== false) errors.push("rankingMutation must be false");
  if (!c.shadowOnly) errors.push("shadowOnly required");
  return errors;
}

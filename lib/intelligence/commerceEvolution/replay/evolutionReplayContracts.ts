/**
 * Phase 10 — Evolution replay contracts.
 */

export const EVOLUTION_REPLAY_VERSION = "phase10";

export const MAX_EVOLUTION_NODES = 20;
export const MAX_EVOLUTION_CANDIDATES = 8;
export const MAX_EVOLUTION_BYTES = 12_288;

export type EvolutionReplayContract = {
  version: string;
  embeddingFree: true;
  vectorDbFree: true;
  agentFree: true;
  rankingMutation: false;
  applyFree: true;
  shadowOnly: true;
  replaySafe: true;
  boundedExecution: true;
  maxLatencyMs: number;
};

export const DEFAULT_EVOLUTION_REPLAY_CONTRACT: EvolutionReplayContract = {
  version: EVOLUTION_REPLAY_VERSION,
  embeddingFree: true,
  vectorDbFree: true,
  agentFree: true,
  rankingMutation: false,
  applyFree: true,
  shadowOnly: true,
  replaySafe: true,
  boundedExecution: true,
  maxLatencyMs: 20,
};

export function validateEvolutionReplayContract(c: EvolutionReplayContract): string[] {
  const errors: string[] = [];
  if (!c.applyFree) errors.push("applyFree required");
  if (c.rankingMutation !== false) errors.push("rankingMutation must be false");
  if (!c.shadowOnly) errors.push("shadowOnly required");
  return errors;
}

/**
 * Phase 6 — Preference replay contracts (deterministic, bounded, shadow-only).
 */

export const MEMORY_REPLAY_CONTRACT_VERSION = "phase6";

export const MAX_INTERACTION_NODES = 48;
export const MAX_INTENT_RECORDS = 24;
export const MAX_RECOMMENDATION_CANDIDATES = 12;
export const MAX_MEMORY_GROWTH_BYTES = 16_384;

export type PreferenceReplayContract = {
  version: string;
  embeddingFree: true;
  vectorDbFree: true;
  rankingMutation: false;
  shadowOnly: true;
  maxLatencyMs: number;
  replaySafe: true;
  boundedExecution: true;
  maxInteractionNodes: number;
  maxIntentRecords: number;
};

export const DEFAULT_PREFERENCE_REPLAY_CONTRACT: PreferenceReplayContract = {
  version: MEMORY_REPLAY_CONTRACT_VERSION,
  embeddingFree: true,
  vectorDbFree: true,
  rankingMutation: false,
  shadowOnly: true,
  maxLatencyMs: 20,
  replaySafe: true,
  boundedExecution: true,
  maxInteractionNodes: MAX_INTERACTION_NODES,
  maxIntentRecords: MAX_INTENT_RECORDS,
};

export function validatePreferenceReplayContract(c: PreferenceReplayContract): string[] {
  const errors: string[] = [];
  if (!c.embeddingFree) errors.push("embeddingFree required");
  if (!c.vectorDbFree) errors.push("vectorDbFree required");
  if (c.rankingMutation !== false) errors.push("rankingMutation must be false");
  if (!c.shadowOnly) errors.push("shadowOnly required");
  if (c.maxLatencyMs <= 0) errors.push("maxLatencyMs must be > 0");
  if (c.maxInteractionNodes <= 0) errors.push("maxInteractionNodes must be > 0");
  return errors;
}

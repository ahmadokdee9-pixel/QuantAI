/**
 * Phase 11 — Brain replay contracts.
 */

export const BRAIN_REPLAY_VERSION = "phase11";

export type BrainReplayContract = {
  version: string;
  embeddingFree: true;
  vectorDbFree: true;
  agentFree: true;
  applyFree: true;
  rankingMutation: false;
  shadowOnly: true;
  replaySafe: true;
  maxSignals: number;
  maxInfluence01: number;
};

export const DEFAULT_BRAIN_REPLAY_CONTRACT: BrainReplayContract = {
  version: BRAIN_REPLAY_VERSION,
  embeddingFree: true,
  vectorDbFree: true,
  agentFree: true,
  applyFree: true,
  rankingMutation: false,
  shadowOnly: true,
  replaySafe: true,
  maxSignals: 24,
  maxInfluence01: 0.15,
};

export function validateBrainReplayContract(c: BrainReplayContract): string[] {
  const errors: string[] = [];
  if (!c.applyFree) errors.push("applyFree required");
  if (c.rankingMutation !== false) errors.push("rankingMutation must be false");
  if (!c.replaySafe) errors.push("replaySafe required");
  return errors;
}

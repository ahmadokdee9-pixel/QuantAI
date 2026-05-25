/**
 * Phase 12 — Replay-safe live commerce signal contracts.
 */

export const MAX_LIVE_SIGNAL_BYTES = 12_288;

export type LiveSignalReplayContract = {
  applyFree: true;
  rankingMutation: false;
  maxInfluence01: number;
  shadowOnly: true;
};

export const DEFAULT_LIVE_SIGNAL_REPLAY_CONTRACT: LiveSignalReplayContract = {
  applyFree: true,
  rankingMutation: false,
  maxInfluence01: 0.12,
  shadowOnly: true,
};

export function validateLiveSignalReplayContract(
  contract: LiveSignalReplayContract = DEFAULT_LIVE_SIGNAL_REPLAY_CONTRACT
): string[] {
  const errors: string[] = [];
  if (!contract.applyFree) errors.push("apply_must_be_free");
  if (contract.rankingMutation !== false) errors.push("ranking_mutation_forbidden");
  if (contract.maxInfluence01 > 0.15) errors.push("max_influence_exceeded");
  if (!contract.shadowOnly) errors.push("shadow_only_required");
  return errors;
}

/**
 * Phase 14 — Replay-safe prediction contracts.
 */

export type PredictionReplayContract = {
  applyFree: true;
  rankingMutation: false;
  maxInfluence01: number;
  shadowOnly: true;
};

export const DEFAULT_PREDICTION_REPLAY_CONTRACT: PredictionReplayContract = {
  applyFree: true,
  rankingMutation: false,
  maxInfluence01: 0.1,
  shadowOnly: true,
};

export function validatePredictionReplayContract(
  contract: PredictionReplayContract = DEFAULT_PREDICTION_REPLAY_CONTRACT
): string[] {
  const errors: string[] = [];
  if (!contract.applyFree) errors.push("apply_must_be_free");
  if (contract.rankingMutation !== false) errors.push("ranking_mutation_forbidden");
  if (contract.maxInfluence01 > 0.12) errors.push("max_influence_exceeded");
  if (!contract.shadowOnly) errors.push("shadow_only_required");
  return errors;
}

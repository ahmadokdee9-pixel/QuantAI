/**
 * Phase 18 — Evolution replay safety contracts.
 */

export type EvolutionReplayContract = {
  applyFree: true;
  rankingMutation: false;
  productionMutation: false;
  maxInfluence01: number;
  shadowOnly: true;
  selfModifying: false;
};

export const DEFAULT_EVOLUTION_REPLAY_CONTRACT: EvolutionReplayContract = {
  applyFree: true,
  rankingMutation: false,
  productionMutation: false,
  maxInfluence01: 0.1,
  shadowOnly: true,
  selfModifying: false,
};

export function validateEvolutionReplayContract(
  contract: EvolutionReplayContract = DEFAULT_EVOLUTION_REPLAY_CONTRACT
): string[] {
  const errors: string[] = [];
  if (!contract.applyFree) errors.push("apply_must_be_free");
  if (contract.rankingMutation !== false) errors.push("ranking_mutation_forbidden");
  if (contract.productionMutation !== false) errors.push("production_mutation_forbidden");
  if (contract.selfModifying !== false) errors.push("self_modifying_forbidden");
  if (contract.maxInfluence01 > 0.12) errors.push("max_influence_exceeded");
  if (!contract.shadowOnly) errors.push("shadow_only_required");
  return errors;
}

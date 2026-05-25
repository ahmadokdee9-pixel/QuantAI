/**
 * Deterministic recommendation apply contracts — shadow prep only.
 */

export const RECOMMENDATION_APPLY_CONTRACT_VERSION = "shadow_apply.1";

export type DeterministicRecommendationApplyContract = {
  version: string;
  liveApply: false;
  shadowOnly: true;
  maxInfluence01: number;
  rankingMutation: false;
  requiresGovernanceApproval: true;
  requiresCanary: true;
};

export const DEFAULT_SHADOW_RECOMMENDATION_APPLY_CONTRACT: DeterministicRecommendationApplyContract =
  {
    version: RECOMMENDATION_APPLY_CONTRACT_VERSION,
    liveApply: false,
    shadowOnly: true,
    maxInfluence01: 0.12,
    rankingMutation: false,
    requiresGovernanceApproval: true,
    requiresCanary: true,
  };

export function validateRecommendationApplyContract(
  c: DeterministicRecommendationApplyContract
): string[] {
  const errors: string[] = [];
  if (c.liveApply !== false) errors.push("liveApply must be false");
  if (c.rankingMutation !== false) errors.push("rankingMutation must be false");
  if (!c.shadowOnly) errors.push("shadowOnly required");
  return errors;
}

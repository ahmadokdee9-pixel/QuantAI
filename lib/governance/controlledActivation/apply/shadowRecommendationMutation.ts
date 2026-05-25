/**
 * Shadow recommendation mutation — prepares apply payload without mutating tray.
 */

import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";
import type { MutationGovernanceVerdict, ShadowRecommendationMutation } from "../types";
import type { ActivationDecision } from "../types";
import {
  DEFAULT_SHADOW_RECOMMENDATION_APPLY_CONTRACT,
  validateRecommendationApplyContract,
} from "./deterministicRecommendationApplyContracts";
import { computeBoundedInfluence } from "../influence/boundedRecommendationInfluence";

export function prepareShadowRecommendationMutation(args: {
  activation: ActivationDecision;
  governance: MutationGovernanceVerdict;
  recommendationResult?: RecommendationCognitionResult | null;
  maxInfluence01: number;
}): ShadowRecommendationMutation {
  const contractErrors = validateRecommendationApplyContract(
    DEFAULT_SHADOW_RECOMMENDATION_APPLY_CONTRACT
  );
  const canPrepare =
    contractErrors.length === 0 &&
    args.activation.inCanary &&
    args.governance.approved &&
    args.activation.mutationAllowed === "shadow_only";

  const influence = canPrepare
    ? Math.min(
        args.maxInfluence01,
        computeBoundedInfluence(args.recommendationResult, args.governance.confidence01)
      )
    : 0;

  return {
    prepared: canPrepare,
    candidateCount: args.recommendationResult?.shadowCandidates.length ?? 0,
    maxInfluence01: influence,
    rankingMutation: false,
    applyContractVersion: DEFAULT_SHADOW_RECOMMENDATION_APPLY_CONTRACT.version,
  };
}

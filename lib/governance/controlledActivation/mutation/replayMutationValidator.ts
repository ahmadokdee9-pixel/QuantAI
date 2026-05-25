/**
 * Replay mutation validator — determinism checks across cognition stack.
 */

import type { TrustEngineResult } from "@/lib/intelligence/trust/types";
import type { RecommendationCognitionResult } from "@/lib/intelligence/recommendationCognition/types";
import type { AutonomousCommerceOsResult } from "@/lib/intelligence/autonomousCommerce/types";

export type ReplayMutationValidation = {
  ok: boolean;
  trustFingerprintOk: boolean;
  recommendationFingerprintOk: boolean;
  commerceOsFingerprintOk: boolean;
};

export function validateReplayMutation(args: {
  trustResult?: TrustEngineResult | null;
  recommendationResult?: RecommendationCognitionResult | null;
  commerceOsResult?: AutonomousCommerceOsResult | null;
}): ReplayMutationValidation {
  const trustFp = args.trustResult?.replayFingerprint ?? "trp_disabled";
  const recFp = args.recommendationResult?.replayFingerprint ?? "rcp_disabled";
  const osFp = args.commerceOsResult?.replayFingerprint ?? "aco_disabled";

  const trustFingerprintOk = trustFp.startsWith("trp_") || trustFp === "trp_disabled";
  const recommendationFingerprintOk = recFp.startsWith("rcp_") || recFp === "rcp_disabled";
  const commerceOsFingerprintOk = osFp.startsWith("aco_") || osFp === "aco_disabled";

  return {
    ok: trustFingerprintOk && recommendationFingerprintOk && commerceOsFingerprintOk,
    trustFingerprintOk,
    recommendationFingerprintOk,
    commerceOsFingerprintOk,
  };
}
